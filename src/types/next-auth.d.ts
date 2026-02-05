import NextAuth, { DefaultSession } from "next-auth";

/**
 * User roles for the multi-tenant system.
 * - ADMIN: Full control of the tenant
 * - MANAGER: Manages tickets and users
 * - TECHNICIAN: Creates and responds to assigned tickets
 * - VIEWER: Read-only access
 */
export type UserRole = 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'VIEWER';

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: UserRole;
            tenantId: string;
            passwordMustChange?: boolean;
        } & DefaultSession["user"];
    }

    interface User {
        role: UserRole;
        tenantId: string;
        passwordMustChange?: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: UserRole;
        tenantId: string;
        passwordMustChange?: boolean;
    }
}
