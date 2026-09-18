import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {},
    
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
