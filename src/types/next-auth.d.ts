import NextAuth, { DefaultSession } from "next-auth";

/**
 * User roles for the multi-tenant system.
 * - ADMIN: Full control of the tenant
 * - MANAGER: Manages tickets and users (no tenant config)
 * - AGENT: Creates and responds to assigned tickets
 * - VIEWER: Read-only access
 * - TECHNICIAN: Legacy role (maps to AGENT)
 * - RECEPTIONIST: Legacy role (maps to VIEWER)
 */
export type UserRole = 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER' | 'TECHNICIAN' | 'RECEPTIONIST';

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
