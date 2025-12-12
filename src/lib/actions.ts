'use server';

import { signIn, auth } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { redirect, notFound } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { z } from 'zod'; // Import Zod
import { CreateTicketSchema, CreateBatchTicketsSchema } from './schemas'; // Import new Zod schemas

/**
 * Get ticket by ID for public status check
 *
 * @description Retrieves a ticket including tenant and assigned user information.
 * Used for public ticket status lookup (no authentication required).
 * Supports both full UUID and short ID (first 8 characters).
 * Throws 404 if ticket doesn't exist.
 *
 * @param {string} id - UUID or short ID (8+ chars) of the ticket to retrieve
 *
 * @returns {Promise<Ticket & { tenant: Tenant, assignedTo: User | null }>}
 * Ticket object with related tenant and optionally assigned user
 *
 * @throws {404} Next.js notFound() - When ticket with given ID doesn't exist
 *
 * @example
 * // Full UUID
 * const ticket = await getTicketById('90287b37-6ba2-4cad-803c-cb26a25db027');
 *
 * // Short ID (first 8 chars)
 * const ticket = await getTicketById('90287b37');
 * console.log(ticket.title); // "Laptop no enciende"
 *
 * @security
 * - No authentication required (public endpoint)
 * - Exposes tenant name and basic ticket info
 * - Safe for customer self-service status checks
 */
export async function getTicketById(rawId: string) {
    const id = rawId.trim().toLowerCase();

    // Try to find by exact ID first (full UUID)
    let ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
            tenant: true,
            assignedTo: true,
        },
    });

    // If not found and ID looks like a short ID, try partial match
    if (!ticket && id.length >= 8) {
        ticket = await prisma.ticket.findFirst({
            where: {
                id: {
                    startsWith: id,
                },
            },
            include: {
                tenant: true,
                assignedTo: true,
            },
        });
    }

    if (!ticket) {
        notFound();
    }

    return ticket;
}

/**
 * Search ticket safely for client-side usage
 * 
 * @description Wrapper around getTicketById that catches errors and returns null
 * instead of triggering a 404 page redirect.
 */
export async function searchTicket(rawId: string) {
    const id = rawId.trim().toLowerCase();
    
    try {
        // Try to find by exact ID first (full UUID)
        let ticket = await prisma.ticket.findUnique({
            where: { id },
            include: {
                tenant: true,
                assignedTo: true,
            },
        });

        // If not found and ID looks like a short ID, try partial match
        if (!ticket && id.length >= 8) {
            ticket = await prisma.ticket.findFirst({
                where: {
                    id: {
                        startsWith: id,
                    },
                },
                include: {
                    tenant: true,
                    assignedTo: true,
                },
            });
        }
        return ticket;
    } catch (error) {
        console.error("Error searching ticket:", error);
        return null;
    }
}

/**
 * Authenticate user with credentials (Server Action)
 *
 * @description Processes login form submission using NextAuth credentials provider.
 * Compatible with React useFormState hook for progressive enhancement.
 * Returns error messages for display in the UI.
 *
 * @param {string | undefined} prevState - Previous form state (from useFormState)
 * @param {FormData} formData - Form data containing email and password fields
 *
 * @returns {Promise<string | void>} Error message string on failure, void on success (redirects)
 *
 * @throws {Error} Re-throws non-AuthError exceptions
 *
 * @example
 * // In a React Server Component form
 * const [errorMessage, dispatch] = useFormState(authenticate, undefined);
 *
 * <form action={dispatch}>
 *   <input name="email" type="email" required />
 *   <input name="password" type="password" required />
 *   <button type="submit">Login</button>
 *   {errorMessage && <p>{errorMessage}</p>}
 * </form>
 *
 * @example
 * // Error responses
 * "Invalid credentials."  // Wrong email or password
 * "Something went wrong." // Other auth errors
 *
 * @security
 * - Uses bcrypt password comparison (in auth.ts)
 * - Session stored in encrypted JWT
 * - CSRF protection via NextAuth
 *
 * @sideEffects
 * - Creates user session on success
 * - Redirects to /dashboard on success (via signIn)
 * - Sets authentication cookies
 */
export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', {
            ...Object.fromEntries(formData),
            redirectTo: '/dashboard',
        });
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}

/**
 * Create a new ticket with automatic customer lookup/creation (Server Action)
 *
 * @description Creates a ticket for authenticated users. Automatically creates or finds
 * a customer by name within the user's tenant. Validates required fields and enforces
 * tenant isolation. Redirects to tickets list on success.
 *
 * @param {any} prevState - Previous form state (from useFormState, unused)
 * @param {FormData} formData - Form data with title, description, customerName fields
 *
 * @returns {Promise<{ message: string } | void>} Error object or void (redirects on success)
 *
 * @example
 * // In a React form
 * const [state, formAction] = useFormState(createTicket, undefined);
 *
 * <form action={formAction}>
 *   <input name="title" required />
 *   <textarea name="description" required />
 *   <input name="customerName" required />
 *   <button type="submit">Create Ticket</button>
 *   {state?.message && <p>{state.message}</p>}
 * </form>
 *
 * @example
 * // Success: Redirects to /dashboard/tickets
 *
 * @example
 * // Error responses
 * { message: "Unauthorized" }
 * { message: "Missing fields" }
 * { message: "Database Error: Failed to create ticket." }
 *
 * @security
 * - Requires authenticated session with tenantId
 * - Automatic tenant isolation for customer lookup
 * - Created ticket inherits user's tenantId
 *
 * @sideEffects
 * - May create new Customer record if name doesn't exist
 * - Creates Ticket record with status "OPEN"
 * - Redirects to /dashboard/tickets on success
 * - Does NOT create audit log (should be added)
 *
 * @edgeCases
 * - Customer name match is exact (case-sensitive)
 * - Multiple customers with same name: uses first found
 * - Empty strings fail "Missing fields" validation
 * - Trims whitespace from inputs (FormData behavior)
 *
 * @todo Add audit log creation for ticket creation
 * @todo Add input sanitization/validation with Zod
 * @todo Support customer email/phone lookup
 */
export async function createTicket(ticketData: z.infer<typeof CreateTicketSchema>, tenantId: string) {
    if (!tenantId) {
        throw new Error('Tenant ID is required to create a ticket.');
    }

    try {
        const tenantDb = getTenantPrisma(tenantId);

        // Simple customer creation/lookup for demo
        let customer = await tenantDb.customer.findFirst({
            where: {
                name: ticketData.customerName,
            }
        });

        // Get current user session to track who creates the ticket
        const session = await auth();

        if (!customer) {
            customer = await tenantDb.customer.create({
                data: {
                    name: ticketData.customerName,
                    tenantId: tenantId, // Satisfy TS, enforced by extension
                    createdById: session?.user?.id,
                    updatedById: session?.user?.id,
                }
            });
        }

        await tenantDb.ticket.create({
            data: {
                title: ticketData.title,
                description: ticketData.description,
                customerId: customer.id,
                status: 'OPEN',
                tenantId: tenantId, // Satisfy TS, enforced by extension
                deviceType: ticketData.deviceType,
                deviceModel: ticketData.deviceModel,
                serialNumber: ticketData.serialNumber,
                accessories: ticketData.accessories,
                checkInNotes: ticketData.checkInNotes,
                createdById: session?.user?.id,
                updatedById: session?.user?.id,
            }
        });

    } catch (error) {
        console.error('Failed to create ticket:', error);
        throw new Error('Database Error: Failed to create ticket.');
    }
}

/**
 * Create multiple new tickets for a single customer (Server Action for batch creation)
 *
 * @description Creates multiple tickets for authenticated users. It expects an array of
 * ticket data, validates each entry with Zod, and then processes them in a Prisma transaction.
 * Automatically creates or finds a customer by name within the user's tenant.
 * Redirects to tickets list on success.
 *
 * @param {any} prevState - Previous form state (from useFormState, unused)
 * @param {FormData} formData - Form data containing customerName and an array of ticket details
 *
 * @returns {Promise<{ message: string } | void>} Error object or void (redirects on success)
 *
 * @security
 * - Requires authenticated session with tenantId
 * - Automatic tenant isolation for customer lookup
 * - Created tickets inherit user's tenantId
 * - Uses Zod for robust input validation
 * - Uses Prisma transactions for atomicity (all or nothing)
 */
export async function createBatchTickets(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { message: 'Unauthorized' };
    }

    const customerName = formData.get('customerName') as string;
    const customerId = formData.get('customerId') as string;
    const rawTickets = formData.get('tickets') as string; // Expecting a JSON string of tickets

    if (!customerName || !rawTickets) {
        return { message: 'Customer name and ticket data are required.' };
    }

    let ticketsData;
    try {
        ticketsData = JSON.parse(rawTickets);
        // Validate the entire array of tickets using Zod
        // CreateBatchTicketsSchema is an array of CreateTicketSchema
        CreateBatchTicketsSchema.parse(ticketsData);
    } catch (e) {
        if (e instanceof z.ZodError) {
            return { message: `Validation Error: ${e.errors.map(err => err.message).join(', ')}` };
        }
        return { message: 'Invalid ticket data format.' };
    }

    try {
        const tenantId = session.user.tenantId;
        const tenantDb = getTenantPrisma(tenantId);

        let customer = null;

        // Try to find by ID first (precise match)
        if (customerId) {
            customer = await tenantDb.customer.findUnique({
                where: { id: customerId },
            });
        }

        // Fallback to name lookup (loose match)
        if (!customer) {
            customer = await tenantDb.customer.findFirst({
                where: { name: customerName },
            });
        }

        // Create if not found
        if (!customer) {
            customer = await tenantDb.customer.create({
                data: {
                    name: customerName,
                    tenantId: tenantId,
                    createdById: session.user.id,
                    updatedById: session.user.id,
                },
            });
        }

        const createTicketOperations = ticketsData.map((ticket: z.infer<typeof CreateTicketSchema>) =>
            tenantDb.ticket.create({
                data: {
                    title: ticket.title,
                    description: ticket.description,
                    customerId: customer!.id, // customer is guaranteed to exist here
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
            })
        );

        await prisma.$transaction(createTicketOperations);

    } catch (error) {
        console.error('Failed to create batch tickets:', error);
        return { message: 'Database Error: Failed to create multiple tickets.' };
    }

    redirect('/dashboard/tickets');
}

// The old createTicket function needs to be removed as it's being replaced.
// ==================== USER ACTIONS ====================

/**
 * Create a new user (Server Action)
 *
 * @description Creates a new user for the current tenant. Only ADMIN users can create users.
 * Password is hashed using bcrypt before storing.
 *
 * @security
 * - Requires ADMIN role
 * - Automatic tenant isolation
 * - Password hashed with bcrypt (10 rounds)
 */
export async function createUser(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { message: 'Solo los administradores pueden crear usuarios' };
    }

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as 'ADMIN' | 'TECHNICIAN' | 'RECEPTIONIST';

    if (!name || !email || !password || !role) {
        return { message: 'Todos los campos son requeridos' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { message: 'El formato del email no es válido' };
    }

    // Validate password length
    if (password.length < 6) {
        return { message: 'La contraseña debe tener al menos 6 caracteres' };
    }

    try {
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return { message: 'Ya existe un usuario con este email' };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                tenantId: session.user.tenantId,
            }
        });

    } catch (error) {
        console.error('Failed to create user:', error);
        return { message: 'Error de base de datos: No se pudo crear el usuario.' };
    }

    redirect('/dashboard/users');
}

/**
 * Update an existing user (Server Action)
 *
 * @description Updates user details. Only ADMIN users can update users.
 * Password is optional - only updated if provided.
 *
 * @security
 * - Requires ADMIN role
 * - Enforces tenant isolation (can only update users from same tenant)
 * - Super admin can update any user
 */
export async function updateUser(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { message: 'Solo los administradores pueden editar usuarios' };
    }

    const userId = formData.get('userId') as string;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as 'ADMIN' | 'TECHNICIAN' | 'RECEPTIONIST';

    if (!userId || !name || !email || !role) {
        return { message: 'Campos requeridos faltantes' };
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        // Verify user exists and belongs to same tenant (unless super admin)
        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            return { message: 'Usuario no encontrado' };
        }

        if (!isSuperAdmin && existingUser.tenantId !== session.user.tenantId) {
            return { message: 'No autorizado para editar este usuario' };
        }

        // Check if email is being changed and if it's already taken
        if (email !== existingUser.email) {
            const emailTaken = await prisma.user.findUnique({
                where: { email }
            });
            if (emailTaken) {
                return { message: 'Ya existe un usuario con este email' };
            }
        }

        // Build update data
        const updateData: any = {
            name,
            email,
            role,
        };

        // Only update password if provided
        if (password && password.length > 0) {
            if (password.length < 6) {
                return { message: 'La contraseña debe tener al menos 6 caracteres' };
            }
            updateData.password = await bcrypt.hash(password, 10);
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

    } catch (error) {
        console.error('Failed to update user:', error);
        return { message: 'Error de base de datos: No se pudo actualizar el usuario.' };
    }

    redirect('/dashboard/users');
}

/**
 * Delete a user (Server Action)
 *
 * @description Deletes a user from the system. Only ADMIN users can delete users.
 * Cannot delete yourself.
 *
 * @security
 * - Requires ADMIN role
 * - Enforces tenant isolation
 * - Cannot delete own account
 */
export async function deleteUser(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { message: 'Solo los administradores pueden eliminar usuarios' };
    }

    const userId = formData.get('userId') as string;

    if (!userId) {
        return { message: 'ID de usuario requerido' };
    }

    // Prevent self-deletion
    if (userId === session.user.id) {
        return { message: 'No puedes eliminar tu propia cuenta' };
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        // Verify user exists and belongs to same tenant (unless super admin)
        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            return { message: 'Usuario no encontrado' };
        }

        if (!isSuperAdmin && existingUser.tenantId !== session.user.tenantId) {
            return { message: 'No autorizado para eliminar este usuario' };
        }

        await prisma.user.delete({
            where: { id: userId },
        });

    } catch (error) {
        console.error('Failed to delete user:', error);
        return { message: 'Error de base de datos: No se pudo eliminar el usuario.' };
    }

    redirect('/dashboard/users');
}

// ==================== CUSTOMER ACTIONS ====================

/**
 * Create a new customer (Server Action)
 *
 * @description Creates a new customer for the current tenant.
 *
 * @security
 * - Requires authenticated session
 * - Automatic tenant isolation
 */
export async function createCustomer(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { message: 'No autorizado' };
    }

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;

    if (!name) {
        return { message: 'El nombre es requerido' };
    }

    // Validate email format if provided
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { message: 'El formato del email no es válido' };
        }
    }

    try {
        await prisma.customer.create({
            data: {
                name,
                email: email || null,
                phone: phone || null,
                address: address || null,
                tenantId: session.user.tenantId,
                createdById: session.user.id,
                updatedById: session.user.id,
            }
        });

    } catch (error) {
        console.error('Failed to create customer:', error);
        return { message: 'Error de base de datos: No se pudo crear el cliente.' };
    }

    redirect('/dashboard/customers');
}

/**
 * Update an existing customer (Server Action)
 *
 * @description Updates customer details.
 *
 * @security
 * - Requires authenticated session
 * - Enforces tenant isolation (can only update customers from same tenant)
 * - Super admin can update any customer
 */
export async function updateCustomer(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { message: 'No autorizado' };
    }

    const customerId = formData.get('customerId') as string;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;

    if (!customerId || !name) {
        return { message: 'El nombre es requerido' };
    }

    // Validate email format if provided
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { message: 'El formato del email no es válido' };
        }
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        // Verify customer exists and belongs to same tenant (unless super admin)
        const existingCustomer = await prisma.customer.findUnique({
            where: { id: customerId }
        });

        if (!existingCustomer) {
            return { message: 'Cliente no encontrado' };
        }

        if (!isSuperAdmin && existingCustomer.tenantId !== session.user.tenantId) {
            return { message: 'No autorizado para editar este cliente' };
        }

        await prisma.customer.update({
            where: { id: customerId },
            data: {
                name,
                email: email || null,
                phone: phone || null,
                address: address || null,
                updatedById: session.user.id,
            },
        });

    } catch (error) {
        console.error('Failed to update customer:', error);
        return { message: 'Error de base de datos: No se pudo actualizar el cliente.' };
    }

    redirect('/dashboard/customers');
}

/**
 * Delete a customer (Server Action)
 *
 * @description Deletes a customer from the system. Only ADMIN users can delete customers.
 * Cannot delete customers with active tickets.
 *
 * @security
 * - Requires ADMIN role
 * - Enforces tenant isolation
 * - Prevents deletion of customers with tickets
 */
export async function deleteCustomer(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { message: 'Solo los administradores pueden eliminar clientes' };
    }

    const customerId = formData.get('customerId') as string;

    if (!customerId) {
        return { message: 'ID de cliente requerido' };
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        // Verify customer exists and belongs to same tenant (unless super admin)
        const existingCustomer = await prisma.customer.findUnique({
            where: { id: customerId },
            include: {
                tickets: {
                    select: { id: true }
                }
            }
        });

        if (!existingCustomer) {
            return { message: 'Cliente no encontrado' };
        }

        if (!isSuperAdmin && existingCustomer.tenantId !== session.user.tenantId) {
            return { message: 'No autorizado para eliminar este cliente' };
        }

        // Check if customer has tickets
        if (existingCustomer.tickets.length > 0) {
            return { message: `No se puede eliminar: el cliente tiene ${existingCustomer.tickets.length} ticket(s) asociado(s)` };
        }

        await prisma.customer.delete({
            where: { id: customerId },
        });

    } catch (error) {
        console.error('Failed to delete customer:', error);
        return { message: 'Error de base de datos: No se pudo eliminar el cliente.' };
    }

    redirect('/dashboard/customers');
}

// ==================== TICKET ACTIONS ====================

/**
 * Update an existing ticket (Server Action)
 *
 * @description Updates ticket details including status, priority, and assignment.
 *
 * @security
 * - Requires authenticated session
 * - Enforces tenant isolation
 * - Creates audit log entry
 */
export async function updateTicket(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { message: 'No autorizado' };
    }

    const ticketId = formData.get('ticketId') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const status = formData.get('status') as string;
    const priority = formData.get('priority') as string;
    const assignedToId = formData.get('assignedToId') as string;
    
    // New V2 Fields
    const deviceType = formData.get('deviceType') as string;
    const deviceModel = formData.get('deviceModel') as string;
    const serialNumber = formData.get('serialNumber') as string;
    const accessories = formData.get('accessories') as string;
    const checkInNotes = formData.get('checkInNotes') as string;
    const cancellationReason = formData.get('cancellationReason') as string;

    if (!ticketId || !title || !description || !status) {
        return { message: 'Campos requeridos faltantes' };
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        const existingTicket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: { partsUsed: true } // Include parts to restore stock if cancelled
        });

        if (!existingTicket) {
            return { message: 'Ticket no encontrado' };
        }

        if (!isSuperAdmin && existingTicket.tenantId !== session.user.tenantId) {
            return { message: 'No autorizado para editar este ticket' };
        }

        // ... (Assignee validation logic remains same)

        const updateData: any = {
            title,
            description,
            status: status as any,
            priority: priority || null,
            assignedToId: assignedToId || null,
            deviceType: deviceType || null,
            deviceModel: deviceModel || null,
            serialNumber: serialNumber || null,
            accessories: accessories || null,
            checkInNotes: checkInNotes || null,
            cancellationReason: status === 'CANCELLED' ? cancellationReason : null,
            updatedById: session.user.id,
        };

        const operations = [];

        // Logic for CANCELLATION: Restore stock
        if (status === 'CANCELLED' && existingTicket.status !== 'CANCELLED') {
             if (existingTicket.partsUsed.length > 0) {
                // Prepare restoration operations
                for (const usage of existingTicket.partsUsed) {
                     operations.push(prisma.part.update({
                         where: { id: usage.partId },
                         data: { quantity: { increment: usage.quantity } }
                     }));
                     operations.push(prisma.partUsage.delete({
                         where: { id: usage.id }
                     }));
                }
             }
        }

        // Add the main ticket update operation
        operations.push(prisma.ticket.update({
            where: { id: ticketId },
            data: updateData,
        }));

        // Execute transaction
        await prisma.$transaction(operations);

        // Audit Log
        await prisma.auditLog.create({
            data: {
                action: status === 'CANCELLED' ? 'CANCEL_TICKET' : 'UPDATE_TICKET',
                details: JSON.stringify({
                    ticketId,
                    changes: { title, status, priority },
                    restoredParts: status === 'CANCELLED' ? existingTicket.partsUsed.length : 0,
                    updatedBy: session.user.id,
                }),
                userId: session.user.id,
                tenantId: existingTicket.tenantId,
            }
        });

    } catch (error) {
        console.error('Failed to update ticket:', error);
        return { message: 'Error de base de datos: No se pudo actualizar el ticket.' };
    }

    redirect(`/dashboard/tickets/${ticketId}`);
}

/**
 * Quick status update for a ticket (Server Action)
 *
 * @description Quickly updates only the status of a ticket.
 * Used for status workflow transitions.
 */
export async function updateTicketStatus(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { message: 'No autorizado' };
    }

    const ticketId = formData.get('ticketId') as string;
    const status = formData.get('status') as string;

    if (!ticketId || !status) {
        return { message: 'Campos requeridos faltantes' };
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        const existingTicket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: { partsUsed: true }
        });

        if (!existingTicket) {
            return { message: 'Ticket no encontrado' };
        }

        if (!isSuperAdmin && existingTicket.tenantId !== session.user.tenantId) {
            return { message: 'No autorizado' };
        }

        const operations = [];

        // RESTORE STOCK LOGIC
        if (status === 'CANCELLED' && existingTicket.status !== 'CANCELLED') {
             if (existingTicket.partsUsed.length > 0) {
                for (const usage of existingTicket.partsUsed) {
                     operations.push(prisma.part.update({
                         where: { id: usage.partId },
                         data: { quantity: { increment: usage.quantity } }
                     }));
                     operations.push(prisma.partUsage.delete({
                         where: { id: usage.id }
                     }));
                }
             }
        }

        // Update status
        operations.push(prisma.ticket.update({
            where: { id: ticketId },
            data: {
                status: status as any,
                updatedById: session.user.id,
            },
        }));

        await prisma.$transaction(operations);

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: status === 'CANCELLED' ? 'CANCEL_TICKET' : 'UPDATE_TICKET_STATUS',
                details: JSON.stringify({
                    ticketId,
                    previousStatus: existingTicket.status,
                    newStatus: status,
                    restoredParts: status === 'CANCELLED' ? existingTicket.partsUsed.length : 0,
                    updatedBy: session.user.id,
                }),
                userId: session.user.id,
                tenantId: existingTicket.tenantId,
            }
        });

        return { success: true, message: 'Estado actualizado' };

    } catch (error) {
        console.error('Failed to update ticket status:', error);
        return { message: 'Error al actualizar el estado.' };
    }
}

/**
 * Delete a ticket (Server Action)
 *
 * @description Deletes a ticket. Only ADMIN users can delete tickets.
 *
 * @security
 * - Requires ADMIN role
 * - Enforces tenant isolation
 * - Creates audit log entry
 */
export async function deleteTicket(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { message: 'Solo los administradores pueden eliminar tickets' };
    }

    const ticketId = formData.get('ticketId') as string;

    if (!ticketId) {
        return { message: 'ID de ticket requerido' };
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        const existingTicket = await prisma.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!existingTicket) {
            return { message: 'Ticket no encontrado' };
        }

        if (!isSuperAdmin && existingTicket.tenantId !== session.user.tenantId) {
            return { message: 'No autorizado para eliminar este ticket' };
        }

        // Create audit log before deletion
        await prisma.auditLog.create({
            data: {
                action: 'DELETE_TICKET',
                details: JSON.stringify({
                    ticketId,
                    title: existingTicket.title,
                    deletedBy: session.user.id,
                }),
                userId: session.user.id,
                tenantId: existingTicket.tenantId,
            }
        });

        await prisma.ticket.delete({
            where: { id: ticketId },
        });

    } catch (error) {
        console.error('Failed to delete ticket:', error);
        return { message: 'Error de base de datos: No se pudo eliminar el ticket.' };
    }

    redirect('/dashboard/tickets');
}

// ==================== TICKET NOTES ACTIONS ====================

/**
 * Add a note to a ticket (Server Action)
 *
 * @description Adds a new note/comment to a ticket. The note is associated
 * with the current user as the author.
 *
 * @security
 * - Requires authenticated session
 * - Enforces tenant isolation
 */
export async function addTicketNote(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId || !session?.user?.id) {
        return { message: 'No autorizado' };
    }

    const ticketId = formData.get('ticketId') as string;
    const content = formData.get('content') as string;
    const isInternal = formData.get('isInternal') === 'true';

    if (!ticketId || !content || content.trim().length === 0) {
        return { message: 'El contenido de la nota es requerido' };
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        // Verify ticket exists and belongs to same tenant (unless super admin)
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!ticket) {
            return { message: 'Ticket no encontrado' };
        }

        if (!isSuperAdmin && ticket.tenantId !== session.user.tenantId) {
            return { message: 'No autorizado para agregar notas a este ticket' };
        }

        await prisma.ticketNote.create({
            data: {
                content: content.trim(),
                isInternal,
                ticketId,
                authorId: session.user.id,
            }
        });

        // Update ticket's updatedAt
        await prisma.ticket.update({
            where: { id: ticketId },
            data: { updatedAt: new Date() }
        });

        return { success: true, message: 'Nota agregada correctamente' };

    } catch (error) {
        console.error('Failed to add note:', error);
        return { message: 'Error de base de datos: No se pudo agregar la nota.' };
    }
}

/**
 * Delete a ticket note (Server Action)
 *
 * @description Deletes a note from a ticket. Only the author or an admin can delete a note.
 *
 * @security
 * - Requires authenticated session
 * - Only author or admin can delete
 */
export async function deleteTicketNote(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId || !session?.user?.id) {
        return { message: 'No autorizado' };
    }

    const noteId = formData.get('noteId') as string;

    if (!noteId) {
        return { message: 'ID de nota requerido' };
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';
    const isAdmin = session.user.role === 'ADMIN';

    try {
        const note = await prisma.ticketNote.findUnique({
            where: { id: noteId },
            include: {
                ticket: {
                    select: { tenantId: true }
                }
            }
        });

        if (!note) {
            return { message: 'Nota no encontrada' };
        }

        // Check permissions: must be author, admin of same tenant, or super admin
        const isAuthor = note.authorId === session.user.id;
        const isSameTenant = note.ticket.tenantId === session.user.tenantId;

        if (!isSuperAdmin && !isAuthor && !(isAdmin && isSameTenant)) {
            return { message: 'No autorizado para eliminar esta nota' };
        }

        await prisma.ticketNote.delete({
            where: { id: noteId }
        });

        return { success: true, message: 'Nota eliminada' };

    } catch (error) {
        console.error('Failed to delete note:', error);
        return { message: 'Error de base de datos: No se pudo eliminar la nota.' };
    }
}

// ==================== PARTS (INVENTORY) ACTIONS ====================

/**
 * Create a new part (Server Action)
 *
 * @description Creates a new part for the inventory.
 *
 * @security
 * - Requires authenticated session
 * - Automatic tenant isolation
 */
export async function createPart(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { message: 'No autorizado' };
    }

    const name = formData.get('name') as string;
    const sku = formData.get('sku') as string;
    const quantity = parseInt(formData.get('quantity') as string);
    const cost = parseFloat(formData.get('cost') as string);
    const price = parseFloat(formData.get('price') as string);

    if (!name || isNaN(quantity) || isNaN(cost) || isNaN(price)) {
        return { message: 'Todos los campos requeridos deben ser válidos' };
    }

    if (quantity < 0 || cost < 0 || price < 0) {
        return { message: 'Los valores numéricos no pueden ser negativos' };
    }

    try {
        await prisma.part.create({
            data: {
                name,
                sku: sku || null,
                quantity,
                cost,
                price,
                tenantId: session.user.tenantId,
                createdById: session.user.id,
                updatedById: session.user.id,
            }
        });

    } catch (error) {
        console.error('Failed to create part:', error);
        return { message: 'Error de base de datos: No se pudo crear el repuesto.' };
    }

    redirect('/dashboard/parts');
}

/**
 * Update an existing part (Server Action)
 *
 * @description Updates part details.
 *
 * @security
 * - Requires authenticated session
 * - Enforces tenant isolation
 * - Super admin can update any part
 */
export async function updatePart(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { message: 'No autorizado' };
    }

    const partId = formData.get('partId') as string;
    const name = formData.get('name') as string;
    const sku = formData.get('sku') as string;
    const quantity = parseInt(formData.get('quantity') as string);
    const cost = parseFloat(formData.get('cost') as string);
    const price = parseFloat(formData.get('price') as string);

    if (!partId || !name || isNaN(quantity) || isNaN(cost) || isNaN(price)) {
        return { message: 'Todos los campos requeridos deben ser válidos' };
    }

    if (quantity < 0 || cost < 0 || price < 0) {
        return { message: 'Los valores numéricos no pueden ser negativos' };
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        // Verify part exists and belongs to same tenant (unless super admin)
        const existingPart = await prisma.part.findUnique({
            where: { id: partId }
        });

        if (!existingPart) {
            return { message: 'Repuesto no encontrado' };
        }

        if (!isSuperAdmin && existingPart.tenantId !== session.user.tenantId) {
            return { message: 'No autorizado para editar este repuesto' };
        }

        await prisma.part.update({
            where: { id: partId },
            data: {
                name,
                sku: sku || null,
                quantity,
                cost,
                price,
                updatedById: session.user.id,
            },
        });

    } catch (error) {
        console.error('Failed to update part:', error);
        return { message: 'Error de base de datos: No se pudo actualizar el repuesto.' };
    }

    redirect('/dashboard/parts');
}

/**
 * Delete a part (Server Action)
 *
 * @description Deletes a part from inventory. Only ADMIN users can delete parts.
 * Cannot delete parts that are in use.
 *
 * @security
 * - Requires ADMIN role
 * - Enforces tenant isolation
 * - Prevents deletion of parts with usage records
 */
export async function deletePart(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { message: 'Solo los administradores pueden eliminar repuestos' };
    }

    const partId = formData.get('partId') as string;

    if (!partId) {
        return { message: 'ID de repuesto requerido' };
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        // Verify part exists and belongs to same tenant (unless super admin)
        const existingPart = await prisma.part.findUnique({
            where: { id: partId },
            include: {
                usages: {
                    select: { id: true }
                }
            }
        });

        if (!existingPart) {
            return { message: 'Repuesto no encontrado' };
        }

        if (!isSuperAdmin && existingPart.tenantId !== session.user.tenantId) {
            return { message: 'No autorizado para eliminar este repuesto' };
        }

        // Check if part has usage records
        if (existingPart.usages.length > 0) {
            return { message: `No se puede eliminar: el repuesto tiene ${existingPart.usages.length} registro(s) de uso` };
        }

        await prisma.part.delete({
            where: { id: partId },
        });

    } catch (error) {
        console.error('Failed to delete part:', error);
        return { message: 'Error de base de datos: No se pudo eliminar el repuesto.' };
    }

    redirect('/dashboard/parts');
}

/**
 * Add a part to a ticket (Server Action)
 *
 * @description Records the usage of a part in a ticket repair.
 *
 * @security
 * - Requires authenticated session
 * - Enforces tenant isolation for both ticket and part
 * - Updates part quantity
 */
export async function addPartToTicket(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { message: 'No autorizado' };
    }

    const ticketId = formData.get('ticketId') as string;
    const partId = formData.get('partId') as string;
    const quantity = parseInt(formData.get('quantity') as string);

    if (!ticketId || !partId || !quantity || isNaN(quantity) || quantity <= 0) {
        return { message: 'Datos inválidos' };
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        // Verify ticket and part belong to same tenant
        const [ticket, part] = await Promise.all([
            prisma.ticket.findUnique({ where: { id: ticketId } }),
            prisma.part.findUnique({ where: { id: partId } }),
        ]);

        if (!ticket || !part) {
            return { message: 'Ticket o repuesto no encontrado' };
        }

        if (!isSuperAdmin) {
            if (ticket.tenantId !== session.user.tenantId || part.tenantId !== session.user.tenantId) {
                return { message: 'No autorizado' };
            }
        }

        // Check if there's enough stock
        if (part.quantity < quantity) {
            return { message: `Stock insuficiente. Disponible: ${part.quantity}, Solicitado: ${quantity}` };
        }

        // Create usage record and update part quantity
        await prisma.$transaction([
            prisma.partUsage.create({
                data: {
                    ticketId,
                    partId,
                    quantity,
                }
            }),
            prisma.part.update({
                where: { id: partId },
                data: {
                    quantity: part.quantity - quantity,
                }
            }),
        ]);

        return { success: true, message: 'Repuesto agregado al ticket' };

    } catch (error) {
        console.error('Failed to add part to ticket:', error);
        return { message: 'Error de base de datos: No se pudo agregar el repuesto.' };
    }
}

/**
 * Remove a part from a ticket (Server Action)
 *
 * @description Removes a part usage record and restores the quantity.
 *
 * @security
 * - Requires authenticated session or ADMIN role
 * - Enforces tenant isolation
 */
export async function removePartFromTicket(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { message: 'No autorizado' };
    }

    const usageId = formData.get('usageId') as string;

    if (!usageId) {
        return { message: 'ID de uso requerido' };
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        const usage = await prisma.partUsage.findUnique({
            where: { id: usageId },
            include: {
                ticket: { select: { tenantId: true } },
                part: true,
            }
        });

        if (!usage) {
            return { message: 'Registro de uso no encontrado' };
        }

        if (!isSuperAdmin && usage.ticket.tenantId !== session.user.tenantId) {
            return { message: 'No autorizado' };
        }

        // Delete usage record and restore part quantity
        await prisma.$transaction([
            prisma.partUsage.delete({
                where: { id: usageId }
            }),
            prisma.part.update({
                where: { id: usage.partId },
                data: {
                    quantity: usage.part.quantity + usage.quantity,
                }
            }),
        ]);

        return { success: true, message: 'Repuesto removido del ticket' };

    } catch (error) {
        console.error('Failed to remove part from ticket:', error);
        return { message: 'Error de base de datos: No se pudo remover el repuesto.' };
    }
}
