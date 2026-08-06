'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CreateTicketSchema, CreateBatchTicketsSchema, UpdateTicketSchema } from '@/lib/schemas';
import { ActionState } from '@/lib/types';
import { createNotification } from '@/lib/notifications';
import { notifyLowStock, notifyTicketCreated, notifyTicketStatusChange, notifyTechnicianAssigned } from '@/lib/ticket-notifications';
import { TicketRepository } from '@/lib/repositories/ticket.repository';
import { CreateTicketUseCase } from '@/use-cases/tickets/CreateTicketUseCase';
import { UpdateTicketUseCase } from '@/use-cases/tickets/UpdateTicketUseCase';
import { UpdateTicketStatusUseCase } from '@/use-cases/tickets/UpdateTicketStatusUseCase';

/**
 * Get ticket by ID for public status check
 */
export async function getTicketById(rawId: string) {
    const ticket = await TicketRepository.findPublicByIdOrNumber(rawId);

    if (!ticket) {
        notFound();
    }

    return ticket;
}

/**
 * Search ticket safely for client-side usage
 */
export async function searchTicket(rawId: string) {
    try {
        const ticket = await TicketRepository.findPublicByIdOrNumber(rawId);
        return ticket;
    } catch (error) {
        console.error("Error searching ticket:", error);
        return null;
    }
}

/**
 * Create a new ticket with automatic customer lookup/creation (Server Action)
 */
export async function createTicket(prevState: any, formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }
    if (session.user.role === 'VIEWER') {
        return { success: false, message: 'Los observadores no pueden crear tickets' };
    }

    const tenantId = session.user.tenantId;

    const rawData = {
        title: formData.get('title'),
        description: formData.get('description'),
        status: formData.get('status') || undefined,
        priority: formData.get('priority') || undefined,
        deviceType: formData.get('deviceType') || undefined,
        deviceModel: formData.get('deviceModel') || undefined,
        serialNumber: formData.get('serialNumber') || undefined,
        accessories: formData.get('accessories') || undefined,
        checkInNotes: formData.get('checkInNotes') || undefined,
    };
    
    let initialParts = [];
    try {
        const partsJson = formData.get('initialParts');
        if (partsJson && typeof partsJson === 'string') {
             initialParts = JSON.parse(partsJson);
        }
    } catch (e) {
        // Ignore parse error
    }

    const customerName = formData.get('customerName') as string;
    const customerId = formData.get('customerId') as string;
    const customerEmail = formData.get('customerEmail') as string;
    const customerPhone = formData.get('customerPhone') as string;
    const customerDpi = formData.get('customerDpi') as string;
    const customerNit = formData.get('customerNit') as string;

    const validatedFields = CreateTicketSchema.safeParse({
        ...rawData,
        initialParts
    });

    if (!validatedFields.success) {
        console.error("Validation Errors:", validatedFields.error.flatten().fieldErrors);
        return {
            success: false,
            message: 'Error de validación',
            errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>
        };
    }

    if ((!customerName || customerName.trim() === '') && !customerId) {
        return { success: false, message: 'El nombre del cliente o un ID válido es requerido.'};
    }    
    
    const ticketData = validatedFields.data;

    try {
        await CreateTicketUseCase.execute({
            ticketData,
            customerInfo: {
                customerName,
                customerId,
                customerEmail,
                customerPhone,
                customerDpi,
                customerNit,
            },
            tenantId,
            userId: session.user.id,
        });
    } catch (error) {
         console.error('Failed to create ticket:', error);
         return { success: false, message: error instanceof Error ? error.message : 'Error creando el ticket' };
    }

    redirect('/dashboard/tickets');
}

/**
 * Create multiple new tickets for a single customer (Server Action for batch creation)
 */
export async function createBatchTickets(prevState: any, formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'Unauthorized' };
    }
    if (session.user.role === 'VIEWER') {
        return { success: false, message: 'Los observadores no pueden crear tickets' };
    }

    const customerName = formData.get('customerName') as string;
    const customerId = formData.get('customerId') as string;
    const customerEmail = formData.get('customerEmail') as string;
    const customerPhone = formData.get('customerPhone') as string;
    const customerDpi = formData.get('customerDpi') as string;
    const customerNit = formData.get('customerNit') as string;
    const rawTickets = formData.get('tickets') as string;

    if (!customerName || !rawTickets) {
        return { success: false, message: 'Customer name and ticket data are required.' };
    }

    let ticketsData;
    try {
        ticketsData = JSON.parse(rawTickets);
        const validated = CreateBatchTicketsSchema.safeParse(ticketsData);
        if (!validated.success) {
            return { 
                success: false, 
                message: 'Error de validación de tickets',
                errors: { tickets: [validated.error.errors[0].message] }
            };
        }
        ticketsData = validated.data;
    } catch (e) {
        return { success: false, message: 'Invalid ticket data format.' };
    }

    try {
        const tenantId = session.user.tenantId;
        const tenantDb = getTenantPrisma(tenantId, session.user.id);

        let customer = null;

        if (customerId) {
            customer = await tenantDb.customer.findUnique({
                where: { id: customerId },
            });
        }

        if (!customer && customerEmail) {
            customer = await tenantDb.customer.findFirst({ where: { email: customerEmail } });
        }
        if (!customer && customerPhone) {
            customer = await tenantDb.customer.findFirst({ where: { phone: customerPhone } });
        }
        if (!customer) {
            customer = await tenantDb.customer.findFirst({ where: { name: customerName } });
        }

        if (!customer) {
            customer = await tenantDb.customer.create({
                data: {
                    name: customerName,
                    email: customerEmail || null,
                    phone: customerPhone || null,
                    dpi: customerDpi || null,
                    nit: customerNit || null,
                    tenantId: tenantId,
                    createdById: session.user.id,
                    updatedById: session.user.id,
                },
            });
        }

        const currentCustomerId = customer.id;

        const createdTicketIds = await prisma.$transaction(async (tx: any) => {
            const txTenantDb = getTenantPrisma(tenantId, session.user.id, tx);
            
            const tickets = await Promise.all(
                ticketsData.map((ticket: z.infer<typeof CreateTicketSchema>) => 
                    txTenantDb.ticket.create({
                        data: {
                            title: ticket.title,
                            description: ticket.description,
                            customerId: currentCustomerId,
                            status: 'OPEN',
                            tenantId: tenantId,
                            deviceType: ticket.deviceType,
                            deviceModel: ticket.deviceModel,
                            serialNumber: ticket.serialNumber,
                            accessories: ticket.accessories,
                            checkInNotes: ticket.checkInNotes,
                            createdById: session.user.id,
                            updatedById: session.user.id,
                        },
                        select: { id: true }
                    })
                )
            );
            return tickets.map((t: any) => t.id);
        });

        (async () => {
             const createdTickets = await tenantDb.ticket.findMany({
                where: { id: { in: createdTicketIds } },
                include: { customer: true, assignedTo: true }
            });

            for (const ticket of createdTickets) {
                try {
                    await notifyTicketCreated({
                        id: ticket.id,
                        ticketNumber: ticket.ticketNumber,
                        title: ticket.title,
                        deviceType: ticket.deviceType,
                        deviceModel: ticket.deviceModel,
                        status: ticket.status,
                        customerId: ticket.customerId,
                        customer: {
                            id: ticket.customer.id,
                            name: ticket.customer.name,
                            email: ticket.customer.email,
                        },
                        assignedTo: ticket.assignedTo,
                        tenantId: ticket.tenantId,
                    });
                } catch (notificationError) {
                    console.error('Failed to send batch ticket notification:', notificationError);
                }
            }
        })();

        revalidatePath('/dashboard/tickets');
    } catch (error) {
        console.error('Failed to create batch tickets:', error);
        return { success: false, message: 'Error de base de datos: No se pudieron crear los tickets.' };
    }

    redirect('/dashboard/tickets');
}

/**
 * Update an existing ticket (Server Action)
 */
export async function updateTicket(prevState: any, formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }
    if (session.user.role === 'VIEWER') {
        return { success: false, message: 'Los observadores no pueden editar tickets' };
    }

    const { user } = session;

    const rawData: Record<string, any> = Object.fromEntries(formData);
    
    if (rawData.assignedToId === '') rawData.assignedToId = null;
    if (rawData.priority === '') rawData.priority = null;
    if (rawData.status === '') rawData.status = undefined; 
    if (rawData.deviceType === '') rawData.deviceType = null;
    if (rawData.deviceModel === '') rawData.deviceModel = null;
    if (rawData.serialNumber === '') rawData.serialNumber = null;
    if (rawData.accessories === '') rawData.accessories = null;
    if (rawData.checkInNotes === '') rawData.checkInNotes = null;
    if (rawData.cancellationReason === '') rawData.cancellationReason = null;

    const validatedFields = UpdateTicketSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Error de validación',
            errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>
        };
    }

    try {
        await UpdateTicketUseCase.execute({
            validatedData: validatedFields.data,
            tenantId: user.tenantId,
            userId: user.id,
            userName: user.name || 'Admin',
        });

        return { success: true, message: 'Ticket actualizado exitosamente' };
    } catch (error) {
        console.error('Failed to update ticket:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Error de base de datos: No se pudo actualizar el ticket.' };
    }
}

/**
 * Quick status update for a ticket (Server Action)
 */
export async function updateTicketStatus(prevState: any, formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }
    if (session.user.role === 'VIEWER') {
        return { success: false, message: 'Los observadores no pueden cambiar el estado' };
    }

    const ticketId = formData.get('ticketId') as string;
    const status = formData.get('status') as string; 
    const note = formData.get('note') as string | null;

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'RESOLVED', 'CLOSED', 'CANCELLED'];
    
    if (!ticketId || !status) {
        return { success: false, message: 'Campos requeridos faltantes' };
    }
    
    if (!validStatuses.includes(status)) {
        return { success: false, message: 'Estado inválido' };
    }

    const { user } = session;

    try {
        await UpdateTicketStatusUseCase.execute({
            ticketId,
            status,
            note,
            tenantId: user.tenantId,
            userId: user.id,
        });

        return { success: true, message: 'Estado actualizado' };
    } catch (error) {
        console.error('Failed to update ticket status:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Error al actualizar el estado.' };
    }
}

/**
 * Delete a ticket (Server Action)
 */
export async function deleteTicket(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { success: false, message: 'Solo los administradores pueden eliminar tickets' };
    }

    const ticketId = formData.get('ticketId') as string;

    if (!ticketId) {
        return { success: false, message: 'ID de ticket requerido' };
    }

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        const existingTicket = await tenantDb.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!existingTicket) {
            return { success: false, message: 'Ticket no encontrado' };
        }

        await tenantDb.ticket.delete({
            where: { id: ticketId },
        });

    } catch (error) {
        console.error('Failed to delete ticket:', error);
        return { success: false, message: 'Error de base de datos: No se pudo eliminar el ticket.' };
    }

    redirect('/dashboard/tickets');
}

/**
 * Add a note to a ticket (Server Action)
 */
export async function addTicketNote(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId || !session?.user?.id) {
        return { success: false, message: 'No autorizado' };
    }
    if (session.user.role === 'VIEWER') {
        return { success: false, message: 'Los observadores no pueden agregar notas' };
    }

    const ticketId = formData.get('ticketId') as string;
    const content = formData.get('content') as string;
    const isInternal = formData.get('isInternal') === 'true';

    if (!ticketId || !content || content.trim().length === 0) {
        return { success: false, message: 'El contenido de la nota es requerido' };
    }

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        const ticket = await tenantDb.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!ticket) {
            return { success: false, message: 'Ticket no encontrado' };
        }

        await tenantDb.ticketNote.create({
            data: {
                content: content.trim(),
                isInternal,
                ticketId,
                authorId: session.user.id,
            }
        });

        await tenantDb.ticket.update({
            where: { id: ticketId },
            data: { updatedAt: new Date() }
        });

        if (ticket.assignedToId && ticket.assignedToId !== session.user.id) {
            await createNotification({
                userId: ticket.assignedToId,
                tenantId: session.user.tenantId,
                type: 'INFO',
                title: 'Nueva Nota en Ticket',
                message: `Nueva nota en ticket #${ticket.id.slice(0, 8)}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                link: `/dashboard/tickets/${ticketId}`
            });
        }

        return { success: true, message: 'Nota agregada correctamente' };

    } catch (error) {
        console.error('Failed to add note:', error);
        return { success: false, message: 'Error de base de datos: No se pudo agregar la nota.' };
    }
}

/**
 * Delete a ticket note (Server Action)
 */
export async function deleteTicketNote(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId || !session?.user?.id) {
        return { success: false, message: 'No autorizado' };
    }

    const noteId = formData.get('noteId') as string;

    if (!noteId) {
        return { success: false, message: 'ID de nota requerido' };
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';
    const isAdmin = session.user.role === 'ADMIN';

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        const note = await tenantDb.ticketNote.findUnique({
            where: { id: noteId },
            include: {
                ticket: {
                    select: { tenantId: true }
                }
            }
        });

        if (!note) {
            return { success: false, message: 'Nota no encontrada' };
        }

        const isAuthor = note.authorId === session.user.id;
        const isSameTenant = note.ticket.tenantId === session.user.tenantId;

        if (!isSuperAdmin && !isAuthor && !(isAdmin && isSameTenant)) {
            return { success: false, message: 'No autorizado para eliminar esta nota' };
        }

        await tenantDb.ticketNote.delete({
            where: { id: noteId }
        });

        return { success: true, message: 'Nota eliminada' };

    } catch (error) {
        console.error('Failed to delete note:', error);
        return { success: false, message: 'Error de base de datos: No se pudo eliminar la nota.' };
    }
}

/**
 * Add a part to a ticket (Server Action)
 */
export async function addPartToTicket(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    const ticketId = formData.get('ticketId') as string;
    const partId = formData.get('partId') as string;
    const quantity = parseInt(formData.get('quantity') as string);

    if (!ticketId || !partId || !quantity || isNaN(quantity) || quantity <= 0) {
        return { success: false, message: 'Datos inválidos' };
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        await prisma.$transaction(async (tx: any) => {
            const txTenantDb = getTenantPrisma(session.user.tenantId, session.user.id, tx);

            const ticket = await txTenantDb.ticket.findUnique({ where: { id: ticketId } });
            if (!ticket) {
                throw new Error('Ticket no encontrado');
            }

            if (!isSuperAdmin && ticket.tenantId !== session.user.tenantId) {
                throw new Error('No autorizado');
            }

            const part = await txTenantDb.part.findUnique({ where: { id: partId } });
            
            if (!part) {
                throw new Error('Repuesto no encontrado');
            }

            if (!isSuperAdmin && part.tenantId !== session.user.tenantId) {
                throw new Error('No autorizado');
            }

            if (part.quantity < quantity) {
                 throw new Error(`Stock insuficiente. Disponible: ${part.quantity}, Solicitado: ${quantity}`);
            }

            await txTenantDb.partUsage.create({
                data: {
                    ticketId,
                    partId,
                    quantity,
                }
            });

            const updatedPart = await tx.part.findUnique({
                where: { id: partId },
                select: { id: true, name: true, quantity: true, minStock: true, tenantId: true }
            });

            if (updatedPart && updatedPart.quantity <= updatedPart.minStock) {
                const admins = await tx.user.findMany({
                    where: {
                        tenantId: updatedPart.tenantId,
                        role: 'ADMIN',
                    },
                    select: { id: true }
                });

                const adminIds = admins.map((a: { id: string }) => a.id);
                await notifyLowStock(updatedPart.tenantId, updatedPart, adminIds);
            }
        });

        return { success: true, message: 'Repuesto agregado al ticket' };

    } catch (error: any) {
        console.error('Failed to add part to ticket:', error);
        return { success: false, message: error.message || 'Error de base de datos: No se pudo agregar el repuesto.' };
    }
}

/**
 * Remove a part from a ticket (Server Action)
 */
export async function removePartFromTicket(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    const usageId = formData.get('usageId') as string;

    if (!usageId) {
        return { success: false, message: 'ID de uso requerido' };
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        await prisma.$transaction(async (tx: any) => {
            const txTenantDb = getTenantPrisma(session.user.tenantId, session.user.id, tx);

            const usage = await txTenantDb.partUsage.findUnique({
                where: { id: usageId },
                include: {
                    ticket: { select: { tenantId: true } },
                    part: true,
                }
            });

            if (!usage) {
                throw new Error('Registro de uso no encontrado');
            }

            if (!isSuperAdmin && usage.ticket.tenantId !== session.user.tenantId) {
                throw new Error('No autorizado');
            }

            await txTenantDb.partUsage.delete({
                where: { id: usageId }
            });
        });

        return { success: true, message: 'Repuesto removido del ticket' };

    } catch (error: any) {
        console.error('Failed to remove part from ticket:', error);
        return { success: false, message: error.message || 'Error de base de datos: No se pudo remover el repuesto.' };
    }
}

/**
 * Add a service to a ticket (Server Action)
 */
export async function addServiceToTicket(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    const ticketId = formData.get('ticketId') as string;
    const serviceId = formData.get('serviceId') as string;

    if (!ticketId || !serviceId) {
        return { success: false, message: 'Ticket y Servicio son requeridos' };
    }

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        const ticket = await tenantDb.ticket.findUnique({
            where: { id: ticketId },
        });

        if (!ticket) {
            return { success: false, message: 'Ticket no encontrado' };
        }

        if (ticket.tenantId !== session.user.tenantId) {
            return { success: false, message: 'No autorizado para editar este ticket' };
        }

        const service = await tenantDb.serviceTemplate.findUnique({
            where: { id: serviceId },
        });

        if (!service) {
            return { success: false, message: 'Servicio no encontrado' };
        }

        if (service.tenantId !== session.user.tenantId) {
            return { success: false, message: 'Servicio no pertenece a este tenant' };
        }

        await tenantDb.ticketService.create({
            data: {
                ticketId,
                serviceId,
                name: service.name,
                laborCost: service.laborCost || 0,
            }
        });

        return { success: true, message: 'Servicio agregado al ticket' };

    } catch (error) {
        console.error('Failed to add service to ticket:', error);
        return { success: false, message: 'Error de base de datos: No se pudo agregar el servicio.' };
    }
}

/**
 * Remove a service from a ticket (Server Action)
 */
export async function removeServiceFromTicket(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    const serviceUsageId = formData.get('serviceUsageId') as string;

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        const usage = await tenantDb.ticketService.findUnique({
            where: { id: serviceUsageId },
            include: { ticket: true }
        });

        if (!usage) {
            return { success: false, message: 'Servicio no encontrado en el ticket' };
        }

        if (usage.ticket.tenantId !== session.user.tenantId) {
            return { success: false, message: 'No autorizado para editar este ticket' };
        }

        await tenantDb.ticketService.delete({
            where: { id: serviceUsageId }
        });

        return { success: true, message: 'Servicio eliminado del ticket' };

    } catch (error) {
        console.error('Failed to remove service from ticket:', error);
        return { success: false, message: 'Error de base de datos: No se pudo eliminar el servicio.' };
    }
}
