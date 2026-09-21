interface AuthUser {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: string;
    tenantId?: string;
}

const SUPERADMIN_EMAILS = (process.env['SUPERADMIN_EMAILS'] || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export function isSuperAdmin(user: AuthUser | undefined | null): boolean {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.role === 'SUPERADMIN') return true;
    if (!user.email) return false;
    return SUPERADMIN_EMAILS.includes(user.email.trim().toLowerCase());
}
