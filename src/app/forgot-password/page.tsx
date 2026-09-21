'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '@/lib/actions/auth-actions';
import styles from '@/app/login/login.module.css';

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    return await requestPasswordReset(formData);
  }, undefined);

  return (
    <main className={styles['container']}>
      {/* Decorative Blobs */}
      <div className={styles['decorativeBlobs']}>
        <div className={styles['blob']} />
        <div className={styles['blob']} />
        <div className={styles['blob']} />
      </div>

      <div className={styles['contentWrapper']}>
        {/* Header (Back Link) */}
        <header className={styles['header']}>
          <Link href="/login" className={styles['backLink']}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles['backIcon']}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Volver al inicio de sesión
          </Link>
        </header>

        {/* Card */}
        <div className={styles['loginCard']}>
          <div className={`${styles['brandHeader']} ${styles['animatedItem']}`}>
            <div className={styles['brandLogo']}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0110 0v4"></path>
              </svg>
            </div>
            <h1 className={styles['brandTitle']}>Recuperar Contraseña</h1>
            <p className={styles['brandSubtitle']}>
              Ingresa tu correo y te enviaremos un enlace
            </p>
          </div>

          <form action={formAction} className={`${styles['form']} ${styles['animatedItem']}`}>
            <div className={styles['inputGroup']}>
              <label htmlFor="email" className={styles['label']}>
                Correo electrónico
              </label>
              <div className={styles['inputWrapper']}>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="admin@example.com"
                  required
                  className={styles['input']}
                />
              </div>
            </div>

            {state?.error && (
              <div className={styles['errorMessage']} role="alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles['errorIcon']}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {state.error}
              </div>
            )}
            
            {state?.success && (
              <div className={styles['errorMessage']} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }} role="alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles['errorIcon']}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                {state.success}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className={styles['submitButton']}
            >
              {isPending ? 'Enviando...' : 'Enviar enlace de recuperación'}
              {!isPending && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles['submitIcon']}>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
