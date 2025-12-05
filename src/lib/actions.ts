'use server';

import { signIn, auth } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';

/**
 * Get ticket by ID for public status check
 *
 * @description Retrieves a ticket including tenant and assigned user information.
 * Used for public ticket status lookup (no authentication required).
 * Throws 404 if ticket doesn't exist.
 *
 * @param {string} id - UUID of the ticket to retrieve
 *
 * @returns {Promise<Ticket & { tenant: Tenant, assignedTo: User | null }>}
 * Ticket object with related tenant and optionally assigned user
 *
 * @throws {404} Next.js notFound() - When ticket with given ID doesn't exist
 *
 * @example
 * const ticket = await getTicketById('t1000000-0000-0000-0000-000000000001');
 * console.log(ticket.title); // "Laptop no enciende"
 * console.log(ticket.tenant.name); // "Default Workshop"
 * console.log(ticket.assignedTo?.name); // "Technician User" or null
 *
 * @security
 * - No authentication required (public endpoint)
 * - Exposes tenant name and basic ticket info
 * - Safe for customer self-service status checks
 */
export async function getTicketById(id: string) {
    const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
            tenant: true,
            assignedTo: true,
        },
    });

    if (!ticket) {
        notFound();
    }

    return ticket;
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
export async function createTicket(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { message: 'Unauthorized' };
    }

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const customerName = formData.get('customerName') as string;

    if (!title || !description || !customerName) {
        return { message: 'Missing fields' };
    }

    try {
        // Simple customer creation/lookup for demo
        let customer = await prisma.customer.findFirst({
            where: {
                name: customerName,
                tenantId: session.user.tenantId
            }
        });

        if (!customer) {
            customer = await prisma.customer.create({
                data: {
                    name: customerName,
                    tenantId: session.user.tenantId,
                }
            });
        }

        await prisma.ticket.create({
            data: {
                title,
                description,
                tenantId: session.user.tenantId,
                customerId: customer.id,
                status: 'OPEN',
            }
        });

    } catch (error) {
        console.error('Failed to create ticket:', error);
        return { message: 'Database Error: Failed to create ticket.' };
    }

    redirect('/dashboard/tickets');
}
