import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { logAction, createSession, checkSuspiciousActivity } from "@/lib/audit-actions";
import { headers } from "next/headers";

// Helper to get client IP
async function getIp(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return "127.0.0.1";
}

async function getUser(email: string) {
    try {
        const user = await prisma.user.findFirst({
            where: { email },
            include: { tenant: true },
        });
        return user;
    } catch (error) {
        console.error("Failed to fetch user:", error);
        throw new Error("Failed to fetch user.");
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    trustHost: true,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const ip = await getIp();

                    // Security: Detect suspicious activity
                    const check = await checkSuspiciousActivity(ip, email);
                    if (check.suspicious) {
                        console.warn(`Suspicious activity detected from IP ${ip} for email ${email}: ${check.reason}`);
                        // Optionally throw or return null
                        return null; 
                    }

                    const user = await getUser(email);
                    
                    if (!user) {
                        await logAction('LOGIN_FAILED', 'AUTH', {
                            metadata: { email, reason: 'User not found' },
                            success: false,
                            tenantId: 'SYSTEM', // System level if no user
                        });
                        return null;
                    }

                    if (!user.isActive) {
                        await logAction('LOGIN_FAILED', 'AUTH', {
                            metadata: { email, reason: 'Account deactivated' },
                            success: false,
                            tenantId: user.tenantId,
                            userId: user.id
                        });
                        return null;
                    }

                    const passwordsMatch = await compare(password, user.password);
                    if (passwordsMatch) {
                        // Reset failed attempts if they existed
                        if (user.failedLoginAttempts > 0) {
                            await prisma.user.update({
                                where: { id: user.id },
                                data: { failedLoginAttempts: 0, lockedUntil: null }
                            });
                        }

                        await logAction('LOGIN_SUCCESS', 'AUTH', {
                            tenantId: user.tenantId,
                            userId: user.id
                        });

                        // Create internal SessionLog
                        await createSession(user.id, user.tenantId);

                        return user;
                    } else {
                        // Increment failed attempts
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { failedLoginAttempts: { increment: 1 } }
                        });

                        await logAction('LOGIN_FAILED', 'AUTH', {
                            metadata: { email, reason: 'Invalid password' },
                            success: false,
                            tenantId: user.tenantId,
                            userId: user.id
                        });
                    }
                }

                console.log("Invalid credentials format");
                return null;
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
            }
            if (token.role && session.user) {
                session.user.role = token.role as any;
            }
            if (token.tenantId && session.user) {
                session.user.tenantId = token.tenantId as string;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.tenantId = user.tenantId;
            }
            return token;
        },
    },
});