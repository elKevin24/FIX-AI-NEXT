import NextAuth, { DefaultSession } from "next-auth";
import { UserRole } from "@prisma/client";

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
