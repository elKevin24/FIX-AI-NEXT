'use server';

import { signIn, auth } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { redirect, notFound } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { z } from 'zod'; // Import Zod
import { CreateTicketSchema, CreateBatchTicketsSchema, UpdateTicketSchema, CreateUserSchema, UpdateUserSchema, CreateCustomerSchema, UpdateCustomerSchema, CreatePartSchema, UpdatePartSchema } from './schemas';
import { createNotification } from '@/lib/notifications';
import { notifyLowStock, notifyTicketCreated, notifyTicketStatusChange, notifyTechnicianAssigned } from './ticket-notifications';

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
import { ActionState } from '@/lib/types';

// ... (existing imports, but add ActionState above if not reusing existing replacement block)

// We need to keep the file imports valid. I will assume imports are at the top.
// Since I can't easily jump to top and back without multiple replace calls, I'll update the functions first and assume I add imports later or if I did it already.
// Wait, I haven't added the import yet. I should add it with the `authenticate` change if it's close to top, or just add it.
// The file starts with imports. I'll add the import first.

/**
 * Authenticate user with credentials (Server Action)
 */
export async function authenticate(
    prevState: any | undefined,
    formData: FormData,
): Promise<ActionState> {
    try {
        await signIn('credentials', {
            ...Object.fromEntries(formData),
            redirectTo: '/dashboard',
        });
        return { success: true, message: 'Redirecting...' };
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return { success: false, message: 'Invalid credentials.' };
                default:
                    return { success: false, message: 'Something went wrong.' };
            }
        }
        throw error;
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

    const tenantId = session.user.tenantId;

    // Extract basic fields with cleanup
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
    
    // Parse Initial Parts safely
    let initialParts = [];
    try {
        const partsJson = formData.get('initialParts');
        if (partsJson && typeof partsJson === 'string') {
             initialParts = JSON.parse(partsJson);
        }
    } catch (e) {
        // Ignore parse error, validation will catch it if needed or it will be empty
    }

    const customerName = formData.get('customerName') as string;
    const customerId = formData.get('customerId') as string;
    const customerEmail = formData.get('customerEmail') as string;
    const customerPhone = formData.get('customerPhone') as string;
    const customerDpi = formData.get('customerDpi') as string;
    const customerNit = formData.get('customerNit') as string;

    // Validate with Zod
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
        const tenantDb = getTenantPrisma(tenantId, session.user.id);
        
        // 1. Find or Create Customer (Smart Lookup)
        let customer = null;

        // A. Try direct ID match if provided
        if (customerId) {
            customer = await tenantDb.customer.findUnique({
                where: { id: customerId }
            });
        }

        // B. Try Email match
        if (!customer && customerEmail) {
            customer = await tenantDb.customer.findFirst({
                where: { email: customerEmail }
            });
        }

        // C. Try Phone match
        if (!customer && customerPhone) {
            customer = await tenantDb.customer.findFirst({
                where: { phone: customerPhone }
            });
        }

        // D. Fallback to Name match (Legacy behavior, but still useful)
        if (!customer && customerName) {
            customer = await tenantDb.customer.findFirst({
                where: { name: customerName }
            });
        }

        // Create if completely new
        if (!customer) {
            // Basic validation for new customer creation if we rely on it here
            if (!customerName) {
                 return { success: false, message: 'Nombre de cliente requerido para crear uno nuevo.' };
            }

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
                }
            });
        }

        // 2. ATOMIC TRANSACTION: Ticket + Stock
        const transactionResult = await prisma.$transaction(async (tx: any) => {
            const lowStockAlerts: Array<{name: string, quantity: number}> = [];
            
            // Create Ticket
            const newTicket = await tx.ticket.create({
                data: {
                    title: ticketData.title,
                    description: ticketData.description,
                    customerId: customer!.id, // We know customer exists now
                    status: ticketData.status || 'OPEN',
                    priority: ticketData.priority || 'MEDIUM',
                    tenantId: tenantId,
                    deviceType: ticketData.deviceType,
                    deviceModel: ticketData.deviceModel,
                    serialNumber: ticketData.serialNumber,
                    accessories: ticketData.accessories,
                    checkInNotes: ticketData.checkInNotes,
                    createdById: session.user.id,
                    updatedById: session.user.id,
                },
                include: {
                    customer: true,
                    assignedTo: true,
                }
            });

            // Audit Log
            await tx.auditLog.create({
                data: {
                    action: 'CREATE_TICKET',
                    details: JSON.stringify({ id: newTicket.id, title: newTicket.title }),
                    user: { connect: { id: session.user.id } },
                    tenant: { connect: { id: tenantId } }
                }
            });

             // Process Initial Parts (Stock Deduction)
            if (ticketData.initialParts && ticketData.initialParts.length > 0) {
                for (const partItem of ticketData.initialParts) {
                    const part = await tx.part.findUnique({ where: { id: partItem.partId } });

                    if (!part) {
                        throw new Error(`Repuesto no encontrado: ${partItem.partId}`);
                    }
                    if (part.tenantId !== tenantId) {
                        throw new Error('No autorizado');
                    }
                    if (part.quantity < partItem.quantity) {
                        throw new Error(`Stock insuficiente para '${part.name}'. Disponibles: ${part.quantity}, Solicitados: ${partItem.quantity}`);
                    }

                    // Create usage record (Trigger handles decrement)
                    await tx.partUsage.create({
                        data: {
                            ticketId: newTicket.id,
                            partId: partItem.partId,
                            quantity: partItem.quantity,
                        },
                    });

                    // Check for low stock
                    if (part.quantity - partItem.quantity <= part.minStock) {
                        lowStockAlerts.push({ name: part.name, quantity: part.quantity - partItem.quantity });
                    }
                }
            }

            return { ticket: newTicket, lowStockAlerts };
        });

        // Destructure result
        const { ticket: createdTicket, lowStockAlerts: alerts } = transactionResult;

        // 3. NOTIFICATIONS
        // Low Stock
        if (alerts.length > 0) {
            Promise.all(alerts.map(async (alert) => {
                try {
                    await notifyLowStock(alert.name, alert.quantity, tenantId);
                } catch (e) {
                    console.error(`Failed to notify low stock for ${alert.name}`, e);
                }
            })).catch(err => console.error('Error processing low stock alerts', err));
        }

        // Ticket Created
        try {
            await notifyTicketCreated({
                id: createdTicket.id,
                ticketNumber: createdTicket.ticketNumber || createdTicket.id.slice(0, 8),
                title: createdTicket.title,
                status: createdTicket.status,
                tenantId: createdTicket.tenantId,
                customerId: createdTicket.customerId,
                deviceType: createdTicket.deviceType,
                deviceModel: createdTicket.deviceModel,
                assignedToId: createdTicket.assignedToId,
                customer: {
                    id: createdTicket.customer.id,
                    name: createdTicket.customer.name,
                    email: createdTicket.customer.email,
                },
                assignedTo: createdTicket.assignedTo ? {
                    name: createdTicket.assignedTo.name,
                    email: createdTicket.assignedTo.email
                } : null,
            });
        } catch (e) {
            console.error('Error sending ticket created notification:', e);
        }

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
                // Flatten array errors is tricky, so just sending a summary message or first error
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

        // Try to find by ID first (precise match)
        if (customerId) {
            customer = await tenantDb.customer.findUnique({
                where: { id: customerId },
            });
        }

        // Smart Lookup: Try Email -> Phone -> Name
        if (!customer && customerEmail) {
            customer = await tenantDb.customer.findFirst({ where: { email: customerEmail } });
        }
        if (!customer && customerPhone) {
            customer = await tenantDb.customer.findFirst({ where: { phone: customerPhone } });
        }
        if (!customer) {
            customer = await tenantDb.customer.findFirst({ where: { name: customerName } });
        }

        // Create if not found
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

        // Use interactive transaction for batch creation
        const createdTicketIds = await prisma.$transaction(async (tx: any) => {
            const txTenantDb = getTenantPrisma(tenantId, session.user.id, tx);
            
            // We map the validated data
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

        // Notify customer for each ticket created in the batch (Background)
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

        return { success: true, message: 'Tickets creados exitosamente' };

    } catch (error) {
        console.error('Failed to create batch tickets:', error);
        return { success: false, message: 'Error de base de datos: No se pudieron crear los tickets.' };
    }
}

// ==================== USER ACTIONS ====================

/**
 * Create a new user (Server Action)
 */
export async function createUser(prevState: any, formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { success: false, message: 'Solo los administradores pueden crear usuarios' };
    }

    const formDataObj = Object.fromEntries(formData);
    const validatedFields = CreateUserSchema.safeParse(formDataObj);

    if (!validatedFields.success) {
        return { 
            success: false, 
            message: 'Error de validación', 
            errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>
        };
    }

    const { name, email, password, role } = validatedFields.data;

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);
        
        const existingUser = await tenantDb.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return { success: false, message: 'El usuario ya existe' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await tenantDb.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                tenantId: session.user.tenantId,
            }
        });

        return { success: true, message: 'Usuario creado exitosamente' };
    } catch (error) {
        console.error('Failed to create user:', error);
        return { success: false, message: 'Error al crear usuario' };
    }
}



/**
 * Update an existing user (Server Action)
 */
export async function updateUser(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { success: false, message: 'Solo los administradores pueden editar usuarios' };
    }

    const formDataObj = Object.fromEntries(formData);
    const validatedFields = UpdateUserSchema.safeParse(formDataObj);

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }

    const { userId, name, email, password, role } = validatedFields.data;

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        // Verify user exists
        // tenantDb.user.findUnique automatically scopes to tenantId
        // so checking `existingUser.tenantId !== session.user.tenantId` is redundant
        // UNLESS we are SuperAdmin who might want to edit across tenants?
        // But `auth()` returns a session with `tenantId`. SuperAdmin might act within that tenant context?
        // The original code handled SuperAdmin bypassing tenant check.
        // `getTenantPrisma` ENFORCES tenantId.
        // If SuperAdmin wants to edit ANY user, `getTenantPrisma` with a specific tenantId limits them.
        // If `isSuperAdmin`, maybe we should use `prisma` direct?
        // But the requirement says "Migrate ... to automatic audit logging".
        // `getTenantPrisma` creates logs.
        // If SuperAdmin works, they likely work within a tenant context or should.
        // For now, let's assume standard admin flow.

        const existingUser = await tenantDb.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            return { success: false, message: 'Usuario no encontrado' };
        }

        // Check email uniqueness
        if (email !== existingUser.email) {
             const emailTaken = await tenantDb.user.findFirst({
                 where: { email }
             });
             if (emailTaken) {
                 return { success: false, message: 'Ya existe un usuario con este email' };
             }
        }

        const updateData: any = {
            name,
            email,
            role,
        };

        if (password && password.length > 0) {
            if (password.length < 6) {
                return { success: false, message: 'La contraseña debe tener al menos 6 caracteres' };
            }
            updateData.password = await bcrypt.hash(password, 10);
        }

        await tenantDb.user.update({
            where: { id: userId },
            data: updateData,
        });

    } catch (error) {
        console.error('Failed to update user:', error);
        return { success: false, message: 'Error de base de datos: No se pudo actualizar el usuario.' };
    }

    redirect('/dashboard/users');
}

/**
 * Delete a user (Server Action)
 */
export async function deleteUser(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { success: false, message: 'Solo los administradores pueden eliminar usuarios' };
    }

    const userId = formData.get('userId') as string;

    if (!userId) {
        return { success: false, message: 'ID de usuario requerido' };
    }

    if (userId === session.user.id) {
        return { success: false, message: 'No puedes eliminar tu propia cuenta' };
    }

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        const existingUser = await tenantDb.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            return { success: false, message: 'Usuario no encontrado' };
        }

        await tenantDb.user.delete({
            where: { id: userId },
        });

    } catch (error) {
        console.error('Failed to delete user:', error);
        return { success: false, message: 'Error de base de datos: No se pudo eliminar el usuario.' };
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
        return { success: false, message: 'No autorizado' };
    }

    const formDataObj = Object.fromEntries(formData);
    const validatedFields = CreateCustomerSchema.safeParse(formDataObj);

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }

    const { name, email, phone, address, dpi, nit } = validatedFields.data;

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        await tenantDb.customer.create({
            data: {
                name,
                email: email || null,
                phone: phone || null,
                address: address || null,
                dpi: dpi || null,
                nit: nit || null,
                tenantId: session.user.tenantId,
                createdById: session.user.id,
                updatedById: session.user.id,
            }
        });

    } catch (error) {
        console.error('Failed to create customer:', error);
        return { success: false, message: 'Error de base de datos: No se pudo crear el cliente.' };
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
        return { success: false, message: 'No autorizado' };
    }

    const formDataObj = Object.fromEntries(formData);
    const validatedFields = UpdateCustomerSchema.safeParse(formDataObj);

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }

    const { customerId, name, email, phone, address, dpi, nit } = validatedFields.data;

    // TODO: REMOVE THIS SUPER ADMIN CHECK ONCE MULTI-TENANCY IS FULLY STABILIZED
    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        // Verify customer exists and belongs to same tenant (unless super admin)
        const existingCustomer = await tenantDb.customer.findUnique({
            where: { id: customerId }
        });

        if (!existingCustomer) {
            return { success: false, message: 'Cliente no encontrado' };
        }

        if (!isSuperAdmin && existingCustomer.tenantId !== session.user.tenantId) {
            return { success: false, message: 'No autorizado para editar este cliente' };
        }

        await tenantDb.customer.update({
            where: { id: customerId },
            data: {
                name,
                email: email || null,
                phone: phone || null,
                address: address || null,
                dpi: dpi || null,
                nit: nit || null,
                updatedById: session.user.id,
            },
        });

    } catch (error) {
        console.error('Failed to update customer:', error);
        return { success: false, message: 'Error de base de datos: No se pudo actualizar el cliente.' };
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
        return { success: false, message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { success: false, message: 'Solo los administradores pueden eliminar clientes' };
    }

    const customerId = formData.get('customerId') as string;

    if (!customerId) {
        return { success: false, message: 'ID de cliente requerido' };
    }

    // TODO: REMOVE THIS SUPER ADMIN CHECK ONCE MULTI-TENANCY IS FULLY STABILIZED
    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        // Verify customer exists and belongs to same tenant (unless super admin)
        const existingCustomer = await tenantDb.customer.findUnique({
            where: { id: customerId },
            include: {
                tickets: {
                    select: { id: true }
                }
            }
        });

        if (!existingCustomer) {
            return { success: false, message: 'Cliente no encontrado' };
        }

        if (!isSuperAdmin && existingCustomer.tenantId !== session.user.tenantId) {
            return { success: false, message: 'No autorizado para eliminar este cliente' };
        }

        // Check if customer has tickets
        if (existingCustomer.tickets.length > 0) {
            return { success: false, message: `No se puede eliminar: el cliente tiene ${existingCustomer.tickets.length} ticket(s) asociado(s)` };
        }

        await tenantDb.customer.delete({
            where: { id: customerId },
        });

    } catch (error) {
        console.error('Failed to delete customer:', error);
        return { success: false, message: 'Error de base de datos: No se pudo eliminar el cliente.' };
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
export async function updateTicket(prevState: any, formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    const { user } = session;

    // Convert FormData to object for Zod
    const rawData: Record<string, any> = Object.fromEntries(formData);
    
    // Normalize empty strings to null for Zod nullable fields
    if (rawData.assignedToId === '') rawData.assignedToId = null;
    if (rawData.priority === '') rawData.priority = null;
    if (rawData.status === '') rawData.status = undefined; 
    if (rawData.deviceType === '') rawData.deviceType = null;
    if (rawData.deviceModel === '') rawData.deviceModel = null;
    if (rawData.serialNumber === '') rawData.serialNumber = null;
    if (rawData.accessories === '') rawData.accessories = null;
    if (rawData.checkInNotes === '') rawData.checkInNotes = null;
    if (rawData.cancellationReason === '') rawData.cancellationReason = null;

    // Temporary Super Admin Check
    const isSuperAdmin = user.email === 'adminkev@example.com';

    // Validate
    const validatedFields = UpdateTicketSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Error de validación',
            errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>
        };
    }

    const { 
        ticketId, title, description, status, priority, assignedToId,
        deviceType, deviceModel, serialNumber, accessories, checkInNotes, cancellationReason
    } = validatedFields.data;

    try {
        const tenantDb = getTenantPrisma(user.tenantId, user.id);
        
        let existingTicket;
         if (isSuperAdmin) {
            existingTicket = await prisma.ticket.findUnique({
                where: { id: ticketId },
                include: { partsUsed: true, customer: true, assignedTo: true }
            });
        } else {
            existingTicket = await tenantDb.ticket.findUnique({
                where: { id: ticketId },
                include: { partsUsed: true, customer: true, assignedTo: true }
            });
        }

        if (!existingTicket) {
             return { success: false, message: 'Ticket no encontrado' };
        }

        // CHECK AVAILABILITY if assigning
        if (assignedToId && assignedToId !== existingTicket.assignedToId) {
             const unavailableRecord = await tenantDb.technicianUnavailability.findFirst({
                 where: {
                     userId: assignedToId,
                     startDate: { lte: new Date() },
                     endDate: { gte: new Date() },
                     isActive: true
                 }
             });

             if (unavailableRecord) {
                 return { 
                     success: false, 
                     message: `El técnico seleccionado no está disponible (Motivo: ${unavailableRecord.reason}).` 
                 };
             }
        }

        const updateData: any = {};
        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (status) updateData.status = status;
        if (priority !== undefined) updateData.priority = priority;
        if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
        
        if (deviceType !== undefined) updateData.deviceType = deviceType;
        if (deviceModel !== undefined) updateData.deviceModel = deviceModel;
        if (serialNumber !== undefined) updateData.serialNumber = serialNumber;
        if (accessories !== undefined) updateData.accessories = accessories;
        if (checkInNotes !== undefined) updateData.checkInNotes = checkInNotes;
        if (status === 'CANCELLED' && cancellationReason) updateData.cancellationReason = cancellationReason;

        updateData.updatedById = user.id;

        // Execute Transaction
        await prisma.$transaction(async (tx: any) => {
             const txTenantDb = getTenantPrisma(existingTicket.tenantId, user.id, tx);

             // CANCELLATION Logic: Restore stock
             if (status === 'CANCELLED' && existingTicket.status !== 'CANCELLED') {
                 if (existingTicket.partsUsed.length > 0) {
                     for (const usage of existingTicket.partsUsed) {
                         // Direct restore logic matching previous implementation behavior
                         await txTenantDb.partUsage.delete({
                             where: { id: usage.id }
                         });
                     }
                 }
             }

             await txTenantDb.ticket.update({
                 where: { id: ticketId },
                 data: updateData,
             });
        });

        // Notifications
        // Status Change
        if (status && status !== existingTicket.status) {
             try {
                 await notifyTicketStatusChange(
                    {
                        id: existingTicket.id,
                        ticketNumber: existingTicket.ticketNumber,
                        title: updateData.title || existingTicket.title,
                        status: existingTicket.status,
                        tenantId: existingTicket.tenantId,
                        customerId: existingTicket.customerId,
                        customer: existingTicket.customer,
                        assignedToId: existingTicket.assignedToId,
                        deviceType: existingTicket.deviceType || 'PC',
                        deviceModel: existingTicket.deviceModel || '',
                        assignedTo: existingTicket.assignedTo,
                    }, 
                    { 
                        oldStatus: existingTicket.status, 
                        newStatus: status,
                        note: updateData.cancellationReason
                    }
                 );
             } catch (e) {
                 console.error('Notification error', e);
             }
        }

        // Technician Assignment
        if (assignedToId && assignedToId !== existingTicket.assignedToId) {
             try {
                 const updatedFullTicket = await tenantDb.ticket.findUnique({
                    where: { id: ticketId },
                    include: { customer: true, assignedTo: true }
                 });
                 
                 if (updatedFullTicket) {
                     await notifyTechnicianAssigned({
                         id: updatedFullTicket.id,
                         ticketNumber: updatedFullTicket.ticketNumber,
                         title: updatedFullTicket.title,
                         status: updatedFullTicket.status,
                         tenantId: updatedFullTicket.tenantId,
                         customerId: updatedFullTicket.customerId,
                         customer: updatedFullTicket.customer,
                         assignedTo: updatedFullTicket.assignedTo || undefined,
                         assignedToId: updatedFullTicket.assignedToId,
                         deviceType: updatedFullTicket.deviceType || 'PC', // Added missing field
                         deviceModel: updatedFullTicket.deviceModel || '' // Added missing field
                     }, user.name || 'Admin');
                 }
             } catch (e) {
                 console.error('Notification error', e);
             }
        }

        return { success: true, message: 'Ticket actualizado exitosamente' };

    } catch (error) {
        console.error('Failed to update ticket:', error);
        return { success: false, message: 'Error de base de datos: No se pudo actualizar el ticket.' };
    }
}

/**
 * Quick status update for a ticket (Server Action)
 *
 * @description Quickly updates only the status of a ticket.
 * Used for status workflow transitions.
 */
export async function updateTicketStatus(prevState: any, formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    const ticketId = formData.get('ticketId') as string;
    const status = formData.get('status') as string; 
    const note = formData.get('note') as string | null;

    // Need to validate status is valid enum
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'RESOLVED', 'CLOSED', 'CANCELLED'];
    
    if (!ticketId || !status) {
        return { success: false, message: 'Campos requeridos faltantes' };
    }
    
    if (!validStatuses.includes(status)) {
        return { success: false, message: 'Estado inválido' };
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';
    const { user } = session;

    try {
        const tenantDb = getTenantPrisma(user.tenantId, user.id);
        
        // 1. Fetch Existing
        let existingTicket;
        if (isSuperAdmin) {
            existingTicket = await prisma.ticket.findUnique({
                 where: { id: ticketId },
                 include: { partsUsed: true, customer: true, assignedTo: true }
            });
        } else {
             existingTicket = await tenantDb.ticket.findUnique({
                where: { id: ticketId },
                include: { partsUsed: true, customer: true, assignedTo: true }
            });
        }

        if (!existingTicket) {
             return { success: false, message: 'Ticket no encontrado' };
        }

        // 2. Transaction for Update (and Stock Restore if Cancelled)
        await prisma.$transaction(async (tx: any) => {
             const txTenantDb = getTenantPrisma(existingTicket.tenantId, user.id, tx);
             
             if (status === 'CANCELLED' && existingTicket.status !== 'CANCELLED') {
                 if (existingTicket.partsUsed.length > 0) {
                     for (const usage of existingTicket.partsUsed) {
                         await txTenantDb.partUsage.delete({
                             where: { id: usage.id }
                         });
                     }
                 }
             }

             await txTenantDb.ticket.update({
                 where: { id: ticketId },
                 data: { status: status as any, updatedById: user.id }
             });

             // Add system note if note provided
             if (note) {
                await txTenantDb.ticketNote.create({
                    data: {
                        ticketId,
                        content: `Cambio de estado a ${status}: ${note}`,
                        isInternal: true,
                        authorId: user.id
                    }
                });
             }
        });

        // 3. Notifications
         if (status !== existingTicket.status) {
             try {
                await notifyTicketStatusChange(
                    {
                        id: existingTicket.id,
                        ticketNumber: existingTicket.ticketNumber,
                        title: existingTicket.title,
                        status: existingTicket.status, // Old status
                        tenantId: existingTicket.tenantId,
                        customerId: existingTicket.customerId,
                        customer: existingTicket.customer,
                        assignedToId: existingTicket.assignedToId,
                        deviceType: existingTicket.deviceType || 'PC',
                        deviceModel: existingTicket.deviceModel || '',
                        assignedTo: existingTicket.assignedTo,
                    }, 
                    { 
                        oldStatus: existingTicket.status, 
                        newStatus: status,
                        note: note || "Cambio de estado"
                    }
                 );
             } catch (e) {
                 console.error('Notification error', e);
             }
        }

        // Notify Assigned User if DIFFERENT from updater (Technician alert)
        if (existingTicket.assignedToId && existingTicket.assignedToId !== session.user.id) {
            // We use simple notification here as it's just a status sync, 
            // but notifyTicketStatusChange already handles customer.
            // Still, for the technician, we stick to the existing logic or use notifyTechnicianAssigned if relevant.
            // But notifyTechnicianAssigned is for NEW assignments.
            // If it's just a status change, technician might want to know too.
            // However, notifyTicketStatusChange handles IN-APP and EMAIL for CUSTOMER.
            // For TECHNICIAN we can keep the simple notification or improve it.
            await createNotification({
                userId: existingTicket.assignedToId,
                tenantId: session.user.tenantId,
                type: 'INFO',
                title: 'Estado del Ticket Actualizado',
                message: `El ticket #${existingTicket.ticketNumber} cambió a estado ${status}`,
                link: `/dashboard/tickets/${ticketId}`
            });
        }

        // Notify CUSTOMER via centralized system
        try {
            const updatedFullTicket = await tenantDb.ticket.findUnique({
                where: { id: ticketId },
                include: { customer: true, assignedTo: true }
            });
            
            if (updatedFullTicket) {
                await notifyTicketStatusChange({
                    ...updatedFullTicket,
                    ticketNumber: updatedFullTicket.ticketNumber,
                } as any, {
                    oldStatus: existingTicket.status as any,
                    newStatus: status as any,
                });
            }
        } catch (e) {
            console.error('Failed to notify customer of status update:', e);
        }

        return { success: true, message: 'Estado actualizado' };

    } catch (error) {
        console.error('Failed to update ticket status:', error);
        return { success: false, message: 'Error al actualizar el estado.' };
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
        return { success: false, message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { success: false, message: 'Solo los administradores pueden eliminar tickets' };
    }

    const ticketId = formData.get('ticketId') as string;

    if (!ticketId) {
        return { success: false, message: 'ID de ticket requerido' };
    }

    // TODO: REMOVE THIS SUPER ADMIN CHECK ONCE MULTI-TENANCY IS FULLY STABILIZED
    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        const existingTicket = await tenantDb.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!existingTicket) {
            return { success: false, message: 'Ticket no encontrado' };
        }

        if (!isSuperAdmin && existingTicket.tenantId !== session.user.tenantId) {
            return { success: false, message: 'No autorizado para eliminar este ticket' };
        }

        // Automatic audit logging handles the log creation
        await tenantDb.ticket.delete({
            where: { id: ticketId },
        });

    } catch (error) {
        console.error('Failed to delete ticket:', error);
        return { success: false, message: 'Error de base de datos: No se pudo eliminar el ticket.' };
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
        return { success: false, message: 'No autorizado' };
    }

    const ticketId = formData.get('ticketId') as string;
    const content = formData.get('content') as string;
    const isInternal = formData.get('isInternal') === 'true';

    if (!ticketId || !content || content.trim().length === 0) {
        return { success: false, message: 'El contenido de la nota es requerido' };
    }

    // TODO: REMOVE THIS SUPER ADMIN CHECK ONCE MULTI-TENANCY IS FULLY STABILIZED
    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        // Verify ticket exists and belongs to same tenant (unless super admin)
        const ticket = await tenantDb.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!ticket) {
            return { success: false, message: 'Ticket no encontrado' };
        }

        if (!isSuperAdmin && ticket.tenantId !== session.user.tenantId) {
            return { success: false, message: 'No autorizado para agregar notas a este ticket' };
        }

        await tenantDb.ticketNote.create({
            data: {
                content: content.trim(),
                isInternal,
                ticketId,
                authorId: session.user.id,
            }
        });

        // Update ticket's updatedAt
        await tenantDb.ticket.update({
            where: { id: ticketId },
            data: { updatedAt: new Date() }
        });

        // Notify Assigned User if note author is different
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
        return { success: false, message: 'No autorizado' };
    }

    const noteId = formData.get('noteId') as string;

    if (!noteId) {
        return { success: false, message: 'ID de nota requerido' };
    }

    // TODO: REMOVE THIS SUPER ADMIN CHECK ONCE MULTI-TENANCY IS FULLY STABILIZED
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

        // Check permissions: must be author, admin of same tenant, or super admin
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
        return { success: false, message: 'No autorizado' };
    }

    const data = {
        name: formData.get('name'),
        sku: formData.get('sku'),
        quantity: Number(formData.get('quantity')),
        cost: Number(formData.get('cost')),
        price: Number(formData.get('price')),
    };

    const validatedFields = CreatePartSchema.safeParse(data);

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }

    const { name, sku, quantity, cost, price } = validatedFields.data;

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        await tenantDb.part.create({
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
        return { success: false, message: 'Error de base de datos: No se pudo crear el repuesto.' };
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
        return { success: false, message: 'No autorizado' };
    }

    const data = {
        partId: formData.get('partId'),
        name: formData.get('name'),
        sku: formData.get('sku'),
        quantity: Number(formData.get('quantity')),
        cost: Number(formData.get('cost')),
        price: Number(formData.get('price')),
    };

    const validatedFields = UpdatePartSchema.safeParse(data);

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }

    const { partId, name, sku, quantity, cost, price } = validatedFields.data;

    // TODO: REMOVE THIS SUPER ADMIN CHECK ONCE MULTI-TENANCY IS FULLY STABILIZED
    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        // Verify part exists and belongs to same tenant (unless super admin)
        const existingPart = await tenantDb.part.findUnique({
            where: { id: partId }
        });

        if (!existingPart) {
            return { success: false, message: 'Repuesto no encontrado' };
        }

        if (!isSuperAdmin && existingPart.tenantId !== session.user.tenantId) {
            return { success: false, message: 'No autorizado para editar este repuesto' };
        }

        const updatedPart = await tenantDb.part.update({
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

        // Check for low stock and notify admins
        if (updatedPart.quantity <= updatedPart.minStock) {
            const admins = await tenantDb.user.findMany({
                where: {
                    role: 'ADMIN',
                },
                select: { id: true }
            });

            const adminIds = admins.map((a: { id: string }) => a.id);
            await notifyLowStock(updatedPart.tenantId, updatedPart, adminIds);
        }

    } catch (error) {
        console.error('Failed to update part:', error);
        return { success: false, message: 'Error de base de datos: No se pudo actualizar el repuesto.' };
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
        return { success: false, message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { success: false, message: 'Solo los administradores pueden eliminar repuestos' };
    }

    const partId = formData.get('partId') as string;

    if (!partId) {
        return { success: false, message: 'ID de repuesto requerido' };
    }

    // TODO: REMOVE THIS SUPER ADMIN CHECK ONCE MULTI-TENANCY IS FULLY STABILIZED
    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        // Verify part exists and belongs to same tenant (unless super admin)
        const existingPart = await tenantDb.part.findUnique({
            where: { id: partId },
            include: {
                usages: {
                    select: { id: true }
                }
            }
        });

        if (!existingPart) {
            return { success: false, message: 'Repuesto no encontrado' };
        }

        if (!isSuperAdmin && existingPart.tenantId !== session.user.tenantId) {
            return { success: false, message: 'No autorizado para eliminar este repuesto' };
        }

        // Check if part has usage records
        if (existingPart.usages.length > 0) {
            return { success: false, message: `No se puede eliminar: el repuesto tiene ${existingPart.usages.length} registro(s) de uso` };
        }

        await tenantDb.part.delete({
            where: { id: partId },
        });

    } catch (error) {
        console.error('Failed to delete part:', error);
        return { success: false, message: 'Error de base de datos: No se pudo eliminar el repuesto.' };
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
        return { success: false, message: 'No autorizado' };
    }

    const ticketId = formData.get('ticketId') as string;
    const partId = formData.get('partId') as string;
    const quantity = parseInt(formData.get('quantity') as string);

    if (!ticketId || !partId || !quantity || isNaN(quantity) || quantity <= 0) {
        return { success: false, message: 'Datos inválidos' };
    }

    // TODO: REMOVE THIS SUPER ADMIN CHECK ONCE MULTI-TENANCY IS FULLY STABILIZED
    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        await prisma.$transaction(async (tx: any) => {
            const txTenantDb = getTenantPrisma(session.user.tenantId, session.user.id, tx);

            // Verify ticket belongs to tenant
            const ticket = await txTenantDb.ticket.findUnique({ where: { id: ticketId } });
            if (!ticket) {
                throw new Error('Ticket no encontrado');
            }

            if (!isSuperAdmin && ticket.tenantId !== session.user.tenantId) {
                throw new Error('No autorizado');
            }

            // 1. Check if part exists and has stock (Optional for UX, trigger enforces it too)
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

            // 2. Create usage record
            // DB Trigger 'trg_update_stock_on_usage' will automatically decrement stock
            // DB Trigger 'trg_prevent_negative_stock' will prevent negative stock
            await txTenantDb.partUsage.create({
                data: {
                    ticketId,
                    partId,
                    quantity,
                }
            });

            // Check for low stock and notify admins
            const updatedPart = await tx.part.findUnique({
                where: { id: partId },
                select: { id: true, name: true, quantity: true, minStock: true, tenantId: true }
            });

            if (updatedPart && updatedPart.quantity <= updatedPart.minStock) {
                // Get admin IDs for this tenant
                const admins = await tx.user.findMany({
                    where: {
                        tenantId: updatedPart.tenantId,
                        role: 'ADMIN',
                    },
                    select: { id: true }
                });

                const adminIds = admins.map((a: { id: string }) => a.id);
                
                // Trigger notification (asynchronously ideally, but since we are in a transaction
                // we should probably do it after or use a background task. 
                // For simplicity and to ensure it's logged if the TX succeeds, 
                // we can call it here or right after TX.)
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
        return { success: false, message: 'No autorizado' };
    }

    const usageId = formData.get('usageId') as string;

    if (!usageId) {
        return { success: false, message: 'ID de uso requerido' };
    }

    // TODO: REMOVE THIS SUPER ADMIN CHECK ONCE MULTI-TENANCY IS FULLY STABILIZED
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

            // Delete usage record and restore part quantity (Handled by DB Trigger)
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

// ==================== SERVICE ACTIONS ====================

/**
 * Add a service to a ticket (Server Action)
 *
 * @description Records the usage of a service/labor in a ticket.
 *
 * @security
 * - Requires authenticated session
 * - Enforces tenant isolation
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
 *
 * @description Removes a service/labor from a ticket.
 *
 * @security
 * - Requires authenticated session
 * - Enforces tenant isolation
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
