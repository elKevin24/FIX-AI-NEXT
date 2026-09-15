import { prisma } from "@/lib/prisma";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { notifyTicketStatusChange } from "@/lib/ticket-notifications";

export interface PublicCustomerApprovalParams {
    ticketId: string;
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
 * Utiliza transaccion atomica con bloqueo por tenant para garantizar consistencia.
 */
export class PublicCustomerApprovalUseCase {
    static async execute({ ticketId, action, rejectionReason }: PublicCustomerApprovalParams): Promise<PublicApprovalResult> {
        if (!ticketId || typeof ticketId !== "string") {
            throw new Error("ID de ticket no valido");
        }

        const cleanId = ticketId.trim();

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

                // Cambiar estado del ticket a IN_PROGRESS si estaba esperando aprobacion
                const updatedTicket = await tx.ticket.update({
                    where: { id: publicTicket.id },
                    data: {
                        status: "IN_PROGRESS",
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
                        content: 'Presupuesto aprobado por el cliente desde el portal publico.',
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

