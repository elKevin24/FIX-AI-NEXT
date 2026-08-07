interface AuthUser {
    id: string;
    email?: string | null;
    name?: string | null;
    role?: string;
    tenantId?: string;
}

const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || 'adminkev@example.com')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export function isSuperAdmin(user: AuthUser | undefined | null): boolean {
    if (!user?.email) return false;
    return SUPERADMIN_EMAILS.includes(user.email.trim().toLowerCase());
}
