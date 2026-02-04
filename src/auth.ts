import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";

/**
 * Busca usuario por email y tenant.
 * Ahora usa compound unique (tenantId, email) por lo que necesitamos
 * buscar con ambos o usar el índice apropiado.
 */
async function getUser(email: string) {
    try {
        // Buscar usuario por email (puede haber múltiples en diferentes tenants)
        // En login, el usuario solo provee email, así que buscamos el primero activo
        const user = await prisma.user.findFirst({
            where: {
                email,
                isActive: true, // Solo usuarios activos pueden hacer login
            },
            include: { tenant: true },
        });
        return user;
    } catch (error) {
        console.error("Failed to fetch user:", error);
        throw new Error("Failed to fetch user.");
    }
}

/**
 * Verifica si la cuenta está bloqueada por intentos fallidos
 */
function isAccountLocked(lockedUntil: Date | null): boolean {
    if (!lockedUntil) return false;
    return new Date() < lockedUntil;
}

/**
 * Registra intento de login fallido
 */
async function recordFailedLogin(userId: string): Promise<{
    isNowLocked: boolean;
    attemptsRemaining: number;
}> {
    const maxAttempts = 5;
    const lockoutDuration = 15 * 60 * 1000; // 15 minutos en ms

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { failedLoginAttempts: true },
    });

    const currentAttempts = (user?.failedLoginAttempts || 0) + 1;

    if (currentAttempts >= maxAttempts) {
        // Bloquear cuenta
        await prisma.user.update({
            where: { id: userId },
            data: {
                failedLoginAttempts: currentAttempts,
                lockedUntil: new Date(Date.now() + lockoutDuration),
            },
        });
        return { isNowLocked: true, attemptsRemaining: 0 };
    }

    await prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: currentAttempts },
    });

    return {
        isNowLocked: false,
        attemptsRemaining: maxAttempts - currentAttempts,
    };
}

/**
 * Registra login exitoso y resetea contadores
 */
async function recordSuccessfulLogin(userId: string): Promise<void> {
    await prisma.user.update({
        where: { id: userId },
        data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
        },
    });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    trustHost: true,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({
                        email: z.string().email(),
                        password: z.string().min(6),
                    })
                    .safeParse(credentials);

                if (!parsedCredentials.success) {
                    // Mensaje genérico para no revelar info
                    console.log("Invalid credentials format");
                    return null;
                }

                const { email, password } = parsedCredentials.data;
                const user = await getUser(email);

                // Mensaje genérico: no revelar si el email existe o no
                if (!user) {
                    console.log("Authentication failed");
                    return null;
                }

                // Verificar si la cuenta está activa
                if (!user.isActive) {
                    console.log("Account deactivated");
                    return null;
                }

                // Verificar si la cuenta está bloqueada
                if (isAccountLocked(user.lockedUntil)) {
                    console.log("Account temporarily locked");
                    return null;
                }

                // Verificar contraseña
                const passwordsMatch = await compare(password, user.password);

                if (!passwordsMatch) {
                    // Registrar intento fallido (no revelar detalles al usuario)
                    await recordFailedLogin(user.id);
                    console.log("Authentication failed");
                    return null;
                }

                // Login exitoso - resetear contadores
                await recordSuccessfulLogin(user.id);

                // Retornar usuario con campos adicionales para la sesión
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                    role: user.role,
                    tenantId: user.tenantId,
                    passwordMustChange: user.passwordMustChange,
                };
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
                session.user.role = token.role as "ADMIN" | "MANAGER" | "AGENT" | "VIEWER" | "TECHNICIAN" | "RECEPTIONIST";
            }
            if (token.tenantId && session.user) {
                session.user.tenantId = token.tenantId as string;
            }
            if (typeof token.passwordMustChange === 'boolean' && session.user) {
                session.user.passwordMustChange = token.passwordMustChange;
            }
            return session;
        },
        async jwt({ token, user, trigger }) {
            if (user) {
                token.role = user.role;
                token.tenantId = user.tenantId;
                token.passwordMustChange = user.passwordMustChange;
            }

            // Si se actualiza la sesión, recargar datos del usuario
            if (trigger === "update") {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.sub },
                    select: {
                        role: true,
                        tenantId: true,
                        passwordMustChange: true,
                        isActive: true,
                    },
                });

                if (dbUser) {
                    token.role = dbUser.role;
                    token.tenantId = dbUser.tenantId;
                    token.passwordMustChange = dbUser.passwordMustChange;

                    // Si el usuario fue desactivado, invalidar token
                    if (!dbUser.isActive) {
                        return null as unknown as typeof token;
                    }
                }
            }

            return token;
        },
    },
});
