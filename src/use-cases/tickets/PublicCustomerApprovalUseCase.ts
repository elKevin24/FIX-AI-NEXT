import { prisma } from "@/lib/prisma";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { notifyTicketStatusChange } from "@/lib/ticket-notifications";

export interface PublicCustomerApprovalParams {
    ticketId: string;
    token: string;
    action: "APPROVE" | "REJECT";
    rejectionReason?: string;
}

export interface PublicApprovalResult {
    success: boolean;
    message: string;
    ticketId: string;
    newStatus: string;
}

/**
 * Permite al cliente final autorizar o rechazar un presupuesto de reparacion
 * desde el portal publico (/tickets/status).
 * Exige un token de autorizacion criptografico de un solo uso (One-Time Token).
 * Utiliza transaccion atomica con bloqueo por tenant para garantizar consistencia.
 */
export class PublicCustomerApprovalUseCase {
    static async execute({ ticketId, token, action, rejectionReason }: PublicCustomerApprovalParams): Promise<PublicApprovalResult> {
        if (!ticketId || typeof ticketId !== "string") {
            throw new Error("ID de ticket no valido");
        }

        if (!token || typeof token !== "string" || token.trim().length < 8) {
            throw new Error("Token de autorizacion invalido o ausente");
        }

        const cleanId = ticketId.trim();
        const cleanToken = token.trim();

        // 1. Localizar el ticket sin requerir sesion de dashboard (acceso publico por ID o numero)
        const publicTicket = await prisma.ticket.findFirst({
            where: {
                OR: [
                    { id: cleanId },
                    { ticketNumber: cleanId }
                ]
            },
            include: {
                partsUsed: {
                    where: { approved: false },
                    include: { part: true }
                },
                services: true,
                customer: true,
                tenant: true,
            }
        });

        if (!publicTicket) {
            throw new Error("Ticket no encontrado");
        }

        // 2. Validar token de autorizacion del cliente (One-Time Token)
        if (!publicTicket.approvalToken || publicTicket.approvalToken !== cleanToken) {
            throw new Error("Token de aprobacion no valido o no autorizado");
        }

        // 3. Validar expiracion del token
        if (publicTicket.approvalTokenExpiresAt && new Date() > publicTicket.approvalTokenExpiresAt) {
            throw new Error("El enlace de autorizacion ha expirado");
        }

        // 4. Blindaje de estado: Solo tickets no cerrados/cancelados pueden procesarse
        if (publicTicket.status === 'CLOSED' || publicTicket.status === 'CANCELLED' || publicTicket.status === 'RESOLVED') {
            throw new Error(`El ticket se encuentra en estado ${publicTicket.status} y no admite modificaciones.`);
        }

        const tenantDb = getTenantPrisma(publicTicket.tenantId);

        if (action === "APPROVE") {
            return await tenantDb.$transaction(async (tx: any) => {
                const pendingParts = await tx.partUsage.findMany({
                    where: { ticketId: publicTicket.id, approved: false },
                    include: { part: true }
                });

                // Validar y aprobar repuestos con locks atomicos de inventario
                const now = new Date();
                for (const usage of pendingParts) {
                    // Validar stock disponible
                    const currentPart = await tx.part.findUnique({
                        where: { id: usage.partId }
                    });

                    if (!currentPart || currentPart.quantity < usage.quantity) {
                        throw new Error(`Stock insuficiente para el repuesto: ${usage.part?.name || usage.partId}`);
                    }

                    // Aprobar uso de parte (el trigger/logica descuenta inventario)
                    await tx.partUsage.update({
                        where: { id: usage.id },
                        data: {
                            approved: true,
                            approvedAt: now,
                        }
                    });

                    // Descuento atomico de stock
                    await tx.part.update({
                        where: { id: usage.partId },
                        data: {
                            quantity: { decrement: usage.quantity }
                        }
                    });
                }

                // Cambiar estado del ticket a IN_PROGRESS e invalidar token de un solo uso
                const updatedTicket = await tx.ticket.update({
                    where: { id: publicTicket.id },
                    data: {
                        status: "IN_PROGRESS",
                        approvalToken: null,
                        approvalTokenExpiresAt: null,
                    }
                });

                // Registrar evento en bitacora / audit log
                await tx.auditLog.create({
                    data: {
                        action: "CUSTOMER_BUDGET_APPROVED",
                        module: "TICKETS",
                        details: JSON.stringify({
                            ticketId: publicTicket.id,
                            approvedPartsCount: pendingParts.length,
                            clientName: publicTicket.customer.name,
                            source: "PUBLIC_PORTAL"
                        }),
                        tenantId: publicTicket.tenantId,
                        entityType: "Ticket",
                        entityId: publicTicket.id,
                    }
                });

                // Registrar nota publica en el ticket
                await tx.ticketNote.create({
                    data: {
                        ticketId: publicTicket.id,
                        content: 'Presupuesto aprobado por el cliente desde el portal publico con token verificado.',
                        isInternal: false,
                        tenantId: publicTicket.tenantId,
                    }
                });

                return {
                    success: true,
                    message: "Presupuesto aprobado exitosamente. El equipo pasa a reparacion.",
                    ticketId: publicTicket.id,
                    newStatus: "IN_PROGRESS",
                };
            });
        } else {
            // Rechazo de cotizacion por el cliente
            return await tenantDb.$transaction(async (tx: any) => {
                const updatedTicket = await tx.ticket.update({
                    where: { id: publicTicket.id },
                    data: {
                        status: "CANCELLED",
                        approvalToken: null,
                        approvalTokenExpiresAt: null,
                    }
                });

                await tx.auditLog.create({
                    data: {
                        action: "CUSTOMER_BUDGET_REJECTED",
                        module: "TICKETS",
                        details: JSON.stringify({
                            ticketId: publicTicket.id,
                            reason: rejectionReason || "Rechazado por el cliente en portal",
                            source: "PUBLIC_PORTAL"
                        }),
                        tenantId: publicTicket.tenantId,
                        entityType: "Ticket",
                        entityId: publicTicket.id,
                    }
                });

                await tx.ticketNote.create({
                    data: {
                        ticketId: publicTicket.id,
                        content: `Presupuesto rechazado por el cliente. Motivo: ${rejectionReason || 'Sin motivo especificado'}`,
                        isInternal: false,
                        tenantId: publicTicket.tenantId,
                    }
                });

                return {
                    success: true,
                    message: "Presupuesto rechazado. El servicio ha sido cancelado.",
                    ticketId: publicTicket.id,
                    newStatus: "CANCELLED",
                };
            });
        }
    }
}

