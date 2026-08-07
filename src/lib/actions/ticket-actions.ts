'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CreateTicketSchema, CreateBatchTicketsSchema, UpdateTicketSchema, UpdateTicketStatusSchema, DeleteTicketSchema } from '@/lib/schemas';
import { ActionState } from '@/lib/types';
import { notifyTicketCreated } from '@/lib/ticket-notifications';
import { TicketRepository } from '@/lib/repositories/ticket.repository';
import { CreateTicketUseCase } from '@/use-cases/tickets/CreateTicketUseCase';
import { UpdateTicketUseCase } from '@/use-cases/tickets/UpdateTicketUseCase';
import { UpdateTicketStatusUseCase } from '@/use-cases/tickets/UpdateTicketStatusUseCase';
import { DeleteTicketUseCase } from '@/use-cases/tickets/DeleteTicketUseCase';
import { AddTicketNoteUseCase } from '@/use-cases/tickets/AddTicketNoteUseCase';
import { DeleteTicketNoteUseCase } from '@/use-cases/tickets/DeleteTicketNoteUseCase';
import { AddPartToTicketUseCase } from '@/use-cases/tickets/AddPartToTicketUseCase';
import { RemovePartFromTicketUseCase } from '@/use-cases/tickets/RemovePartFromTicketUseCase';
import { AddServiceToTicketUseCase } from '@/use-cases/tickets/AddServiceToTicketUseCase';
import { RemoveServiceFromTicketUseCase } from '@/use-cases/tickets/RemoveServiceFromTicketUseCase';

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

        const createdTicketIds = await tenantDb.$transaction(async (tx: any) => {
            const tickets = await Promise.all(
                ticketsData.map((ticket: z.infer<typeof CreateTicketSchema>) => 
                    tx.ticket.create({
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

    const parseResult = UpdateTicketStatusSchema.safeParse({ ticketId, status, note });
    if (!parseResult.success) {
        return {
            success: false,
            message: parseResult.error.issues[0]?.message || 'Datos de estado inválidos.',
        };
    }

    const { user } = session;

    try {
        await UpdateTicketStatusUseCase.execute({
            ticketId: parseResult.data.ticketId,
            status: parseResult.data.status,
            note: parseResult.data.note,
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
    const reason = formData.get('reason') as string;

    const parseResult = DeleteTicketSchema.safeParse({ ticketId, reason });
    if (!parseResult.success) {
        return {
            success: false,
            message: parseResult.error.issues[0]?.message || 'Datos de eliminación inválidos.',
        };
    }

    try {
        await DeleteTicketUseCase.execute({
            ticketId: parseResult.data.ticketId,
            reason: parseResult.data.reason,
            tenantId: session.user.tenantId,
            userId: session.user.id,
        });
    } catch (error) {
        console.error('Failed to delete ticket:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Error de base de datos: No se pudo eliminar el ticket.' };
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
        await AddTicketNoteUseCase.execute({
            ticketId,
            content,
            isInternal,
            tenantId: session.user.tenantId,
            userId: session.user.id,
        });

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

    try {
        await DeleteTicketNoteUseCase.execute({
            noteId,
            tenantId: session.user.tenantId,
            userId: session.user.id,
            role: session.user.role,
            email: session.user.email,
        });

        return { success: true, message: 'Nota eliminada' };
    } catch (error: any) {
        console.error('Failed to delete note:', error);
        if (error?.message?.includes('No autorizado')) {
            return { success: false, message: error.message };
        }
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

    try {
        await AddPartToTicketUseCase.execute({
            ticketId,
            partId,
            quantity,
            tenantId: session.user.tenantId,
            userId: session.user.id,
            email: session.user.email,
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

    try {
        await RemovePartFromTicketUseCase.execute({
            usageId,
            tenantId: session.user.tenantId,
            userId: session.user.id,
            email: session.user.email,
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
        await AddServiceToTicketUseCase.execute({
            ticketId,
            serviceId,
            tenantId: session.user.tenantId,
            userId: session.user.id,
        });

        return { success: true, message: 'Servicio agregado al ticket' };
    } catch (error: any) {
        console.error('Failed to add service to ticket:', error);
        return { success: false, message: error.message || 'Error de base de datos: No se pudo agregar el servicio.' };
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
        await RemoveServiceFromTicketUseCase.execute({
            serviceUsageId,
            tenantId: session.user.tenantId,
            userId: session.user.id,
        });

        return { success: true, message: 'Servicio eliminado del ticket' };
    } catch (error: any) {
        console.error('Failed to remove service from ticket:', error);
        return { success: false, message: error.message || 'Error de base de datos: No se pudo eliminar el servicio.' };
    }
}
