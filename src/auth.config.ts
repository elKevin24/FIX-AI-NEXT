import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            } else if (isLoggedIn) {
                return Response.redirect(new URL("/dashboard", nextUrl));
            }
            return true;
        },
    },
    
    useSecureCookies: process.env['NODE_ENV'] === "production",
    cookies: {
        sessionToken: {
            name: process.env['NODE_ENV'] === "production" ? "__Host-next-auth.session-token" : "next-auth.session-token",
            options: {
                httpOnly: true,
                sameSite: "strict",
                path: "/",
                secure: process.env['NODE_ENV'] === "production",
            },
        },
    },
    providers: [],
} satisfies NextAuthConfig;
