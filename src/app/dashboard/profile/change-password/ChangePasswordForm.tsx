'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { changePassword } from '@/lib/user-actions';
import { PASSWORD_POLICY } from '@/lib/password-utils';
import { Input, Button, Alert } from '@/components/ui';
import styles from './change-password.module.css';

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
            setTimeout(() => {
                router.push('/dashboard');
                router.refresh();
            }, 1500);
        }
    }, [state.success, router]);

    return (
        <form action={formAction} className={styles['form']}>
            {state.message && (
                <Alert variant={state.success ? 'success' : 'error'}>
                    {state.message}
                </Alert>
            )}

            <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                label="Contraseña actual"
                required
                placeholder="Ingresa tu contraseña actual"
                error={state.errors?.['currentPassword']?.[0]}
            />

            <div>
                <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    label="Nueva contraseña"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ingresa tu nueva contraseña"
                    error={state.errors?.['newPassword']?.[0]}
                />

                {/* Password requirements */}
                <div className={styles['requirements']}>
                    <p className={styles['requirementsTitle']}>Requisitos de seguridad:</p>
                    <div className={styles['requirementsGrid']}>
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
                <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    label="Confirmar nueva contraseña"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirma tu nueva contraseña"
                    error={confirmPassword && !passwordsMatch ? 'Las contraseñas no coinciden' : undefined}
                />
            </div>

            <div className={styles['actions']}>
                {!isForced && (
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => router.back()}
                        className={styles['buttonFlex']}
                    >
                        Cancelar
                    </Button>
                )}
                <Button
                    type="submit"
                    variant="primary"
                    disabled={isPending || !allChecksPassed || !passwordsMatch}
                    className={isForced ? styles['buttonFull'] : styles['buttonFlex']}
                >
                    {isPending ? 'Cambiando...' : 'Cambiar Contraseña'}
                </Button>
            </div>
        </form>
    );
}

function PasswordCheck({ passed, children }: { passed: boolean; children: React.ReactNode }) {
    return (
        <div className={`${styles['checkItem']} ${passed ? styles['checkItemPassed'] : ''}`}>
            {passed ? (
                <svg className="shrink-0" width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg className="shrink-0" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                </svg>
            )}
            {children}
        </div>
    );
}
