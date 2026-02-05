'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { changePassword } from '@/lib/user-actions';
import { PASSWORD_POLICY } from '@/lib/password-utils';
import { Button } from '@/components/ui';
import { useEffect, useState } from 'react';

interface ChangePasswordFormProps {
    isForced?: boolean;
}

export default function ChangePasswordForm({ isForced = false }: ChangePasswordFormProps) {
    const router = useRouter();
    const [state, formAction, isPending] = useActionState(changePassword, {
        success: false,
        message: '',
    });
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Password strength indicators
    const passwordChecks = {
        minLength: newPassword.length >= PASSWORD_POLICY.minLength,
        hasUppercase: /[A-Z]/.test(newPassword),
        hasLowercase: /[a-z]/.test(newPassword),
        hasNumber: /\d/.test(newPassword),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    };

    const allChecksPassed = Object.values(passwordChecks).every(Boolean);
    const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

    useEffect(() => {
        if (state.success) {
            // Redirect to dashboard after successful password change
            setTimeout(() => {
                router.push('/dashboard');
                router.refresh();
            }, 1500);
        }
    }, [state.success, router]);

    return (
        <form action={formAction} className="space-y-5">
            {state.message && (
                <div className={`p-3 rounded-lg text-sm ${
                    state.success
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    {state.message}
                </div>
            )}

            <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña actual
                </label>
                <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Ingresa tu contraseña actual"
                />
                {state.errors?.currentPassword && (
                    <p className="mt-1 text-sm text-red-600">{state.errors.currentPassword[0]}</p>
                )}
            </div>

            <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Nueva contraseña
                </label>
                <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Ingresa tu nueva contraseña"
                />
                {state.errors?.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{state.errors.newPassword[0]}</p>
                )}

                {/* Password requirements */}
                <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-medium text-gray-600">Requisitos:</p>
                    <div className="grid grid-cols-2 gap-1">
                        <PasswordCheck passed={passwordChecks.minLength}>
                            Mínimo {PASSWORD_POLICY.minLength} caracteres
                        </PasswordCheck>
                        <PasswordCheck passed={passwordChecks.hasUppercase}>
                            Una mayúscula
                        </PasswordCheck>
                        <PasswordCheck passed={passwordChecks.hasLowercase}>
                            Una minúscula
                        </PasswordCheck>
                        <PasswordCheck passed={passwordChecks.hasNumber}>
                            Un número
                        </PasswordCheck>
                        <PasswordCheck passed={passwordChecks.hasSpecial}>
                            Un carácter especial
                        </PasswordCheck>
                    </div>
                </div>
            </div>

            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar nueva contraseña
                </label>
                <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                        confirmPassword && !passwordsMatch
                            ? 'border-red-300 bg-red-50'
                            : confirmPassword && passwordsMatch
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-300'
                    }`}
                    placeholder="Confirma tu nueva contraseña"
                />
                {confirmPassword && !passwordsMatch && (
                    <p className="mt-1 text-sm text-red-600">Las contraseñas no coinciden</p>
                )}
            </div>

            <div className="flex gap-3 pt-2">
                {!isForced && (
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => router.back()}
                        className="flex-1"
                    >
                        Cancelar
                    </Button>
                )}
                <Button
                    type="submit"
                    variant="primary"
                    disabled={isPending || !allChecksPassed || !passwordsMatch}
                    className={isForced ? 'w-full' : 'flex-1'}
                >
                    {isPending ? 'Cambiando...' : 'Cambiar Contraseña'}
                </Button>
            </div>
        </form>
    );
}

function PasswordCheck({ passed, children }: { passed: boolean; children: React.ReactNode }) {
    return (
        <div className={`flex items-center gap-1.5 text-xs ${passed ? 'text-green-600' : 'text-gray-500'}`}>
            {passed ? (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                </svg>
            )}
            {children}
        </div>
    );
}
