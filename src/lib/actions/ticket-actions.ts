'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import {
    CreateTicketSchema,
    CreateBatchTicketsSchema,
    UpdateTicketSchema,
    UpdateTicketStatusSchema,
    DeleteTicketSchema,
} from '@/lib/schemas';
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
import { ApproveTicketPartsUseCase } from '@/use-cases/tickets/ApproveTicketPartsUseCase';
import { RejectTicketPartsUseCase } from '@/use-cases/tickets/RejectTicketPartsUseCase';
import { RemovePartFromTicketUseCase } from '@/use-cases/tickets/RemovePartFromTicketUseCase';
import { AddServiceToTicketUseCase } from '@/use-cases/tickets/AddServiceToTicketUseCase';
import { RemoveServiceFromTicketUseCase } from '@/use-cases/tickets/RemoveServiceFromTicketUseCase';

/**
 * Get ticket by ID for public status check.
 */
export async function getTicketById(rawId: string) {
    const ticket = await TicketRepository.findPublicByIdOrNumber(rawId);

    if (!ticket) {
        notFound();
    }

    return ticket;
}

/**
 * Search ticket safely for client-side usage. Returns null when not found
 * instead of throwing, making it safe for UI error states.
 */
export async function searchTicket(rawId: string) {
    try {
        return await TicketRepository.findPublicByIdOrNumber(rawId);
    } catch (error) {
        console.error('Error searching ticket:', error);
        return null;
    }
}

/**
 * Create a new ticket with automatic customer lookup/creation (Server Action).
 */
export async function createTicket(
    prevState: ActionState | null,
    formData: FormData,
): Promise<ActionState> {
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

    const initialParts = parseJsonField<unknown[]>(formData.get('initialParts'), []);

    const customerName = formData.get('customerName') as string;
    const customerId = formData.get('customerId') as string;
    const customerEmail = formData.get('customerEmail') as string;
    const customerPhone = formData.get('customerPhone') as string;
    const customerDpi = formData.get('customerDpi') as string;
    const customerNit = formData.get('customerNit') as string;

    const validatedFields = CreateTicketSchema.safeParse({ ...rawData, initialParts });

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Error de validación',
            errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
        };
    }

    if (!customerName?.trim() && !customerId) {
        return { success: false, message: 'El nombre del cliente o un ID válido es requerido.' };
    }

    try {
        await CreateTicketUseCase.execute({
            ticketData: validatedFields.data,
            customerInfo: { customerName, customerId, customerEmail, customerPhone, customerDpi, customerNit },
            tenantId,
            userId: session.user.id,
        });
    } catch (error) {
        console.error('Failed to create ticket:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Error creando el ticket',
        };
    }

    redirect('/dashboard/tickets');
}

/**
 * Create multiple tickets for a single customer (Server Action for batch creation).
 */
export async function createBatchTickets(
    prevState: ActionState | null,
    formData: FormData,
): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
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

    let ticketsData: z.infer<typeof CreateBatchTicketsSchema>;
    try {
        const parsed = JSON.parse(rawTickets);
        const validated = CreateBatchTicketsSchema.safeParse(parsed);
        if (!validated.success) {
            return {
                success: false,
                message: 'Error de validación de tickets',
                errors: { tickets: [validated.error.errors[0].message] },
            };
        }
        ticketsData = validated.data;
    } catch {
        return { success: false, message: 'Invalid ticket data format.' };
    }

    try {
        const { tenantId } = session.user;
        const tenantDb = getTenantPrisma(tenantId, session.user.id);

        const customer = await resolveOrCreateCustomer(tenantDb, {
            customerId,
            customerEmail,
            customerPhone,
            customerName,
            customerDpi,
            customerNit,
            tenantId,
            createdById: session.user.id,
        });

        const createdTicketIds = await tenantDb.$transaction(
            async (tx: Prisma.TransactionClient) => {
                const tickets = await Promise.all(
                    ticketsData.map((ticket: z.infer<typeof CreateTicketSchema>) =>
                        tx.ticket.create({
                            data: {
                                title: ticket.title,
                                description: ticket.description,
                                customerId: customer.id,
                                status: 'OPEN',
                                tenantId,
                                deviceType: ticket.deviceType,
                                deviceModel: ticket.deviceModel,
                                serialNumber: ticket.serialNumber,
                                accessories: ticket.accessories,
                                checkInNotes: ticket.checkInNotes,
                                createdById: session.user.id,
                                updatedById: session.user.id,
                            },
                            select: { id: true },
                        }),
                    ),
                );
                return tickets.map((ticket) => ticket.id);
            },
        );

        // Send notifications after the transaction commits. Using void to
        // explicitly mark this as a non-awaited fire-and-forget call.
        // Notification failures must NOT rollback the ticket creation.
        void sendBatchTicketNotifications(tenantDb, createdTicketIds);

        revalidatePath('/dashboard/tickets');
    } catch (error) {
        console.error('Failed to create batch tickets:', error);
        return {
            success: false,
            message: 'Error de base de datos: No se pudieron crear los tickets.',
        };
    }

    redirect('/dashboard/tickets');
}

/**
 * Update an existing ticket (Server Action).
 */
export async function updateTicket(
    prevState: ActionState | null,
    formData: FormData,
): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }
    if (session.user.role === 'VIEWER') {
        return { success: false, message: 'Los observadores no pueden editar tickets' };
    }

    const { user } = session;
    const rawData: Record<string, unknown> = Object.fromEntries(formData);

    // Normalize empty strings to null/undefined for optional fields
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
            errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
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
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Error de base de datos: No se pudo actualizar el ticket.',
        };
    }
}

/**
 * Quick status update for a ticket (Server Action).
 */
export async function updateTicketStatus(
    prevState: ActionState | null,
    formData: FormData,
): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }
    if (session.user.role === 'VIEWER') {
        return { success: false, message: 'Los observadores no pueden cambiar el estado' };
    }

    const parseResult = UpdateTicketStatusSchema.safeParse({
        ticketId: formData.get('ticketId') as string,
        status: formData.get('status') as string,
        note: formData.get('note') as string | null,
    });

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
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Error al actualizar el estado.',
        };
    }
}

/**
 * Delete a ticket (Server Action). Restricted to ADMIN role.
 */
export async function deleteTicket(
    prevState: ActionState | null,
    formData: FormData,
): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }
    if (session.user.role !== 'ADMIN') {
        return { success: false, message: 'Solo los administradores pueden eliminar tickets' };
    }

    const parseResult = DeleteTicketSchema.safeParse({
        ticketId: formData.get('ticketId') as string,
        reason: formData.get('reason') as string,
    });

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
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Error de base de datos: No se pudo eliminar el ticket.',
        };
    }

    redirect('/dashboard/tickets');
}

/**
 * Add a note to a ticket (Server Action).
 */
export async function addTicketNote(
    prevState: ActionState | null,
    formData: FormData,
): Promise<ActionState> {
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

    if (!ticketId || !content?.trim()) {
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
 * Delete a ticket note (Server Action).
 */
export async function deleteTicketNote(
    prevState: ActionState | null,
    formData: FormData,
): Promise<ActionState> {
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
    } catch (error) {
        console.error('Failed to delete note:', error);
        const message = error instanceof Error ? error.message : 'Error de base de datos: No se pudo eliminar la nota.';
        return { success: false, message };
    }
}

/**
 * Add a part to a ticket (Server Action).
 */
export async function addPartToTicket(
    prevState: ActionState | null,
    formData: FormData,
): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    const ticketId = formData.get('ticketId') as string;
    const partId = formData.get('partId') as string;
    const quantity = parseInt(formData.get('quantity') as string, 10);

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
    } catch (error) {
        console.error('Failed to add part to ticket:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Error de base de datos: No se pudo agregar el repuesto.',
        };
    }
}

/**
 * Approve the customer-authorized parts of a ticket (Server Action).
 * The stock is decremented atomically by the DB trigger on approval.
 */
export async function approveTicketParts(
    prevState: ActionState | null,
    formData: FormData,
): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    const ticketId = formData.get('ticketId') as string;

    if (!ticketId) {
        return { success: false, message: 'Datos inválidos' };
    }

    try {
        await ApproveTicketPartsUseCase.execute({
            ticketId,
            tenantId: session.user.tenantId,
            userId: session.user.id,
            email: session.user.email,
        });

        return { success: true, message: 'Repuestos aprobados. Se continúa con la reparación.' };
    } catch (error) {
        console.error('Failed to approve ticket parts:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Error de base de datos: No se pudieron aprobar los repuestos.',
        };
    }
}

/**
 * Reject the pending parts of a ticket (Server Action).
 */
export async function rejectTicketParts(
    prevState: ActionState | null,
    formData: FormData,
): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    const ticketId = formData.get('ticketId') as string;
    const reason = formData.get('reason') as string;

    if (!ticketId || !reason) {
        return { success: false, message: 'Datos inválidos' };
    }

    try {
        await RejectTicketPartsUseCase.execute({
            ticketId,
            reason,
            tenantId: session.user.tenantId,
            userId: session.user.id,
            email: session.user.email,
        });

        return { success: true, message: 'Repuestos rechazados por el cliente. Ticket rechazado.' };
    } catch (error) {
        console.error('Failed to reject ticket parts:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Error de base de datos: No se pudieron rechazar los repuestos.',
        };
    }
}

/**
 * Remove a part from a ticket (Server Action).
 */
export async function removePartFromTicket(
    prevState: ActionState | null,
    formData: FormData,
): Promise<ActionState> {
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
    } catch (error) {
        console.error('Failed to remove part from ticket:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Error de base de datos: No se pudo remover el repuesto.',
        };
    }
}

/**
 * Add a service to a ticket (Server Action).
 */
export async function addServiceToTicket(
    prevState: ActionState | null,
    formData: FormData,
): Promise<ActionState> {
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
    } catch (error) {
        console.error('Failed to add service to ticket:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Error de base de datos: No se pudo agregar el servicio.',
        };
    }
}

/**
 * Remove a service from a ticket (Server Action).
 */
export async function removeServiceFromTicket(
    prevState: ActionState | null,
    formData: FormData,
): Promise<ActionState> {
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
    } catch (error) {
        console.error('Failed to remove service from ticket:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Error de base de datos: No se pudo eliminar el servicio.',
        };
    }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Safely parses a JSON string field, returning a fallback value on failure. */
function parseJsonField<T>(raw: FormDataEntryValue | null, fallback: T): T {
    if (!raw || typeof raw !== 'string') return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

interface CustomerResolutionInput {
    customerId: string;
    customerEmail: string;
    customerPhone: string;
    customerName: string;
    customerDpi: string;
    customerNit: string;
    tenantId: string;
    createdById: string;
}

/**
 * Resolves an existing customer by ID, email, phone, or name in that priority
 * order, creating a new one only when no match is found.
 */
async function resolveOrCreateCustomer(
    db: ReturnType<typeof getTenantPrisma>,
    input: CustomerResolutionInput,
) {
    const { customerId, customerEmail, customerPhone, customerName, customerDpi, customerNit, tenantId, createdById } = input;

    if (customerId) {
        const existing = await db.customer.findUnique({ where: { id: customerId } });
        if (existing) return existing;
    }

    if (customerEmail) {
        const existing = await db.customer.findFirst({ where: { email: customerEmail } });
        if (existing) return existing;
    }

    if (customerPhone) {
        const existing = await db.customer.findFirst({ where: { phone: customerPhone } });
        if (existing) return existing;
    }

    const byName = await db.customer.findFirst({ where: { name: customerName } });
    if (byName) return byName;

    return db.customer.create({
        data: {
            name: customerName,
            email: customerEmail || null,
            phone: customerPhone || null,
            dpi: customerDpi || null,
            nit: customerNit || null,
            tenantId,
            createdById,
            updatedById: createdById,
        },
    });
}

/**
 * Sends ticket creation notifications for a batch of newly created tickets.
 * This is deliberately fire-and-forget: notification failures must not
 * rollback the ticket creation transaction.
 */
async function sendBatchTicketNotifications(
    db: ReturnType<typeof getTenantPrisma>,
    ticketIds: string[],
): Promise<void> {
    try {
        const tickets = await db.ticket.findMany({
            where: { id: { in: ticketIds } },
            include: { customer: true, assignedTo: true },
        });

        for (const ticket of tickets) {
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
    } catch (error) {
        console.error('Failed to fetch tickets for notification:', error);
    }
}
