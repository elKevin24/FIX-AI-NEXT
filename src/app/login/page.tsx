'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { authenticate } from '@/lib/actions';
import Link from 'next/link';
import styles from './login.module.css';

export default function LoginPage() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={styles.container}>
      {/* Elementos decorativos */}
      <div className={styles.decorativeBlobs}>
        <div className={`${styles.blob} ${styles.blob1}`} />
        <div className={`${styles.blob} ${styles.blob2}`} />
        <div className={`${styles.blob} ${styles.blob3}`} />
      </div>

      {/* Contenedor principal */}
      <div className={styles.cardWrapper}>
        {/* Back to Home Link */}
        <div style={{ marginBottom: 'var(--spacing-4)', textAlign: 'center' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--spacing-2)',
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
              fontSize: 'var(--font-size-sm)',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary-600)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
          >
            <span>←</span> Back to Home
          </Link>
        </div>
        {/* Card */}
        <div className={styles.card}>
          {/* Header */}
          <div className={`${styles.header} ${styles.animatedItem}`}>
            <div className={styles.iconWrapper}>
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className={styles.title}>FIX Workshop</h1>
            <p className={styles.subtitle}>Bienvenido a tu sistema de gestión</p>
          </div>

          {/* Formulario */}
          <form action={formAction} className={`${styles.form} ${styles.animatedItem}`}>
            {/* Email Field */}
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                Correo electrónico
              </label>
              <div className={styles.inputContainer}>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className={styles.input}
                />
                <svg
                  className={styles.inputIcon}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>

            {/* Password Field */}
            <div className={styles.inputGroup}>
              <div className={styles.flexBetween}>
                <label htmlFor="password" className={styles.label}>
                  Contraseña
                </label>
                <Link href="#" className={styles.forgotPassword}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className={styles.inputContainer}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  ) : (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className={styles.errorMessage} role="alert">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p>{errorMessage}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className={styles.submitButton}
            >
              {isPending ? (
                <>
                  <svg
                    className={styles.spinner}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v3m0 12v3m9-9h-3m-12 0H3m16.5-4.5L19.5 6m-15 15l-1.5-1.5M6 19.5L7.5 18m12-12l1.5-1.5M4.5 6L6 7.5"
                    />
                  </svg>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <span>Iniciar sesión</span>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className={`${styles.divider} ${styles.animatedItem}`}>
            <div className={styles.dividerLine} />
            <div className={styles.dividerText}>O continúa con</div>
          </div>

          {/* Demo Credentials */}
          <div className={`${styles.demoCredentials} ${styles.animatedItem}`}>
            <p className={styles.demoTitle}>Credenciales de demostración:</p>
            <div className={styles.demoGrid}>
              <div className={styles.demoCard}>
                <p className={styles.demoUser}>Admin</p>
                <p className={`${styles.demoEmail} ${styles.demoEmailAdmin}`}>admin@example.com</p>
                <p className={styles.demoPassword}>password123</p>
              </div>
              <div className={styles.demoCard}>
                <p className={styles.demoUser}>Técnico</p>
                <p className={`${styles.demoEmail} ${styles.demoEmailTech}`}>tech@example.com</p>
                <p className={styles.demoPassword}>password123</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className={`${styles.footer} ${styles.animatedItem}`}>
            ¿Problemas para acceder?{' '}
            <Link href="#" className={styles.footerLink}>
              Contacta soporte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
