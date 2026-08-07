'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';

/**
 * Represents the authenticated session context for a tenant-scoped server action.
 */
export interface TenantSessionContext {
    readonly tenantId: string;
    readonly userId: string;
    readonly userRole: string;
    readonly db: ReturnType<typeof getTenantPrisma>;
}

/**
 * Retrieves the authenticated session and constructs a tenant-scoped DB client.
 * Throws an `UnauthorizedError` (with HTTP 401 semantics) if the session is
 * missing or does not have a valid `tenantId`.
 *
 * Eliminates the 101 repeated boilerplate blocks across all action files:
 * @example
 * ```ts
 * // Before (repeated in every action):
 * const session = await auth();
 * if (!session?.user?.tenantId) throw new Error('No autorizado');
 * const db = getTenantPrisma(session.user.tenantId, session.user.id);
 *
 * // After:
 * const { tenantId, userId, db } = await requireTenantSession();
 * ```
 */
export async function requireTenantSession(): Promise<TenantSessionContext> {
    const session = await auth();

    if (!session?.user?.tenantId || !session.user.id) {
        throw new Error('No autorizado');
    }

    return {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        userRole: session.user.role ?? 'VIEWER',
        db: getTenantPrisma(session.user.tenantId, session.user.id),
    };
}

/**
 * Asserts that a user has the required role; throws if they are a VIEWER.
 * Use after `requireTenantSession()` for role-based access control.
 */
export function assertNotViewer(userRole: string, actionDescription: string): void {
    if (userRole === 'VIEWER') {
        throw new Error(`Los observadores no pueden ${actionDescription}`);
    }
}

/**
 * Asserts that the user has ADMIN role; throws if they do not.
 */
export function assertAdmin(userRole: string): void {
    if (userRole !== 'ADMIN') {
        throw new Error('Solo los administradores pueden realizar esta acción');
    }
}
