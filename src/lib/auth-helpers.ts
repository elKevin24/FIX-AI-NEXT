import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function getSession() {
    return await auth();
}

export async function getCurrentUser() {
    const session = await getSession();
    return session?.user;
}

export async function getTenantId() {
    const session = await getSession();
    if (!session?.user?.tenantId) {
        // If called from a server action or API route, this ensures we don't proceed without a tenant
        throw new Error("Unauthorized: No tenant ID found in session");
    }
    return session.user.tenantId;
}

export async function requireAuth() {
    const session = await getSession();
    if (!session?.user) {
        redirect("/login");
    }
    return session;
}
