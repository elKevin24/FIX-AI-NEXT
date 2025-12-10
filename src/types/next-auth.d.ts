import NextAuth, { DefaultSession } from "next-auth";

export type UserRole = 'ADMIN' | 'TECHNICIAN' | 'RECEPTIONIST';

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: UserRole;
            tenantId: string;
        } & DefaultSession["user"];
    }

    interface User {
        role: UserRole;
        tenantId: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: UserRole;
        tenantId: string;
    }
}
