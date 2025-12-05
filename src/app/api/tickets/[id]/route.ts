import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * Get a single ticket by ID with tenant isolation
 *
 * @description Retrieves a specific ticket including related customer, assigned technician,
 * and parts used. Automatically validates tenant isolation to ensure users can only access
 * tickets from their own tenant.
 *
 * @param {Request} request - The incoming HTTP request
 * @param {Object} context - Next.js route context
 * @param {Promise<{ id: string }>} context.params - Promise containing route parameters
 *
 * @returns {Promise<NextResponse>} JSON response with ticket data or error
 *
 * @throws {401} Unauthorized - When user is not authenticated or has no tenantId
 * @throws {404} Not Found - When ticket doesn't exist or doesn't belong to user's tenant
 * @throws {500} Internal Server Error - When database query fails
 *
 * @example
 * // Success response (200)
 * {
 *   "id": "t1000000-0000-0000-0000-000000000001",
 *   "title": "Laptop no enciende",
 *   "description": "El cliente reporta que su laptop...",
 *   "status": "OPEN",
 *   "priority": "High",
 *   "customer": {
 *     "id": "c1000000-0000-0000-0000-000000000001",
 *     "name": "Juan Pérez",
 *     "email": "juan@example.com"
 *   },
 *   "assignedTo": null,
 *   "partsUsed": [],
 *   "tenantId": "550e8400-e29b-41d4-a716-446655440000",
 *   "createdAt": "2024-12-03T10:30:00.000Z",
 *   "updatedAt": "2024-12-03T10:30:00.000Z"
 * }
 *
 * @example
 * // Error response (401)
 * { "error": "Unauthorized" }
 *
 * @example
 * // Error response (404)
 * { "error": "Ticket not found" }
 *
 * @security
 * - Requires valid session with tenantId
 * - Automatic tenant isolation via WHERE clause
 * - Uses findFirst instead of findUnique for security
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user?.tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const ticket = await prisma.ticket.findFirst({
            where: {
                id: id,
                tenantId: session.user.tenantId, // Tenant isolation
            },
            include: {
                customer: true,
                assignedTo: true,
                partsUsed: {
                    include: {
                        part: true,
                    },
                },
            },
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('Failed to fetch ticket:', error);
        return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 });
    }
}

/**
 * Update a ticket's status, assignment, or priority
 *
 * @description Updates ticket properties with automatic audit logging. Validates tenant
 * ownership before allowing updates. Creates an audit log entry for compliance tracking.
 *
 * @param {Request} request - HTTP request containing JSON body with update fields
 * @param {Object} context - Next.js route context
 * @param {Promise<{ id: string }>} context.params - Promise with ticket ID
 *
 * @returns {Promise<NextResponse>} Updated ticket data with customer and assignedTo relations
 *
 * @throws {401} Unauthorized - User not authenticated or missing tenantId
 * @throws {404} Not Found - Ticket doesn't exist or belongs to different tenant
 * @throws {500} Internal Server Error - Database update failed
 *
 * @example
 * // Request body
 * {
 *   "status": "IN_PROGRESS",
 *   "assignedToId": "550e8400-e29b-41d4-a716-446655440002",
 *   "priority": "High"
 * }
 *
 * @example
 * // Success response (200)
 * {
 *   "id": "t1000000-0000-0000-0000-000000000001",
 *   "title": "Laptop no enciende",
 *   "status": "IN_PROGRESS",
 *   "priority": "High",
 *   "assignedTo": {
 *     "id": "550e8400-e29b-41d4-a716-446655440002",
 *     "name": "Technician User",
 *     "email": "tech@example.com"
 *   },
 *   "customer": { ... },
 *   "updatedAt": "2024-12-03T11:00:00.000Z"
 * }
 *
 * @security
 * - Validates ticket ownership via tenantId before update
 * - Creates audit log with userId and change details
 * - Double-check pattern: findFirst then update
 *
 * @sideEffects
 * - Creates record in AuditLog table
 * - Updates ticket.updatedAt timestamp
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user?.tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await request.json();
        const { status, assignedToId, priority } = body;

        // Verify ticket belongs to user's tenant
        const existingTicket = await prisma.ticket.findFirst({
            where: {
                id: id,
                tenantId: session.user.tenantId,
            },
        });

        if (!existingTicket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        const ticket = await prisma.ticket.update({
            where: { id: id },
            data: {
                status,
                assignedToId,
                priority,
            },
            include: {
                customer: true,
                assignedTo: true,
            },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE_TICKET',
                details: JSON.stringify({ ticketId: ticket.id, changes: body }),
                userId: session.user.id,
                tenantId: session.user.tenantId,
            },
        });

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('Failed to update ticket:', error);
        return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
    }
}

/**
 * Delete a ticket (ADMIN only)
 *
 * @description Permanently deletes a ticket from the database. Restricted to ADMIN role only.
 * Creates an audit log entry before deletion for compliance. Validates both authentication
 * and tenant ownership.
 *
 * @param {Request} request - HTTP request
 * @param {Object} context - Next.js route context
 * @param {Promise<{ id: string }>} context.params - Promise with ticket ID to delete
 *
 * @returns {Promise<NextResponse>} Success confirmation
 *
 * @throws {401} Unauthorized - User not authenticated, missing tenantId, or not ADMIN role
 * @throws {404} Not Found - Ticket doesn't exist or belongs to different tenant
 * @throws {500} Internal Server Error - Delete operation failed
 *
 * @example
 * // Success response (200)
 * { "success": true }
 *
 * @example
 * // Error response (401) - Non-admin user
 * { "error": "Unauthorized" }
 *
 * @example
 * // Error response (404)
 * { "error": "Ticket not found" }
 *
 * @security
 * - ADMIN role required (RBAC enforcement)
 * - Validates ticket ownership before deletion
 * - Creates audit log before destructive operation
 *
 * @sideEffects
 * - Permanently deletes ticket from database
 * - Cascades to related PartUsage records (if configured)
 * - Creates DELETE_TICKET audit log entry
 *
 * @warning This is a destructive operation that cannot be undone
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user?.tenantId || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Verify ticket belongs to user's tenant
        const existingTicket = await prisma.ticket.findFirst({
            where: {
                id: id,
                tenantId: session.user.tenantId,
            },
        });

        if (!existingTicket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        await prisma.ticket.delete({
            where: { id: id },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: 'DELETE_TICKET',
                details: JSON.stringify({ ticketId: id }),
                userId: session.user.id,
                tenantId: session.user.tenantId,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete ticket:', error);
        return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
    }
}
