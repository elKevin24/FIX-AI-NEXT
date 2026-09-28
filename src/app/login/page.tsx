'use client';

import { useState, useRef } from 'react';
import { useActionState } from 'react';
import { authenticate } from '@/lib/actions';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, ArrowLeft, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import styles from './login.module.css';

export default function LoginPage() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined
  );

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePassword = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowPassword((prev) => {
      const next = !prev;
      if (passwordInputRef.current) {
        const input = passwordInputRef.current;
        input.type = next ? 'text' : 'password';
        // Maintain user cursor position and focus
        requestAnimationFrame(() => {
          input.focus();
          const len = input.value.length;
          try {
            input.setSelectionRange(len, len);
          } catch {
            // Ignore if input type doesn't support selection range
          }
        });
      }
      return next;
    });
  };

  return (
    <div className={styles['container']}>
      {/* Elementos decorativos */}
      <div className={styles['decorativeBlobs']}>
        <div className={`${styles['blob']} ${styles['blob1']}`} />
        <div className={`${styles['blob']} ${styles['blob2']}`} />
        <div className={`${styles['blob']} ${styles['blob3']}`} />
      </div>

      {/* Contenedor principal */}
      <div className={styles['cardWrapper']}>
        {/* Back to Home Link */}
        <div className={styles['backToHomeWrapper']}>
          <Link
            href="/"
            className={styles['backToHome']}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back to Home
          </Link>
        </div>
        {/* Card */}
        <div className={styles['card']}>
          {/* Header */}
          <div className={`${styles['header']} ${styles['animatedItem']}`}>
            <div className={styles['iconWrapper']}>
              <Lock size={30} aria-hidden="true" />
            </div>
            <h1 className={styles['title']}>FIX Workshop</h1>
            <p className={styles['subtitle']}>Bienvenido a tu sistema de gestión</p>
          </div>

          {/* Formulario */}
          <form action={formAction} className={`${styles['form']} ${styles['animatedItem']}`}>
            {/* Email Field */}
            <div className={styles['inputGroup']}>
              <label htmlFor="email" className={styles['label']}>
                Correo electrónico
              </label>
              <div className={styles['inputContainer']}>
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="admin@example.com"
                  required
                  className={styles['input']}
                />
                <Mail className={styles['inputIcon']} size={20} aria-hidden="true" />
              </div>
            </div>

            {/* Password Field */}
            <div className={styles['inputGroup']}>
              <div className={styles['labelRow']}>
                <label htmlFor="password" className={styles['label']}>
                  Contraseña
                </label>
                <Link href="/forgot-password" className={styles['forgotPassword']}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className={styles['inputContainer']}>
                <input
                  ref={passwordInputRef}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className={styles['input']}
                />
                <button
                  type="button"
                  onClick={handleTogglePassword}
                  className={styles['passwordToggle']}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <EyeOff size={19} aria-hidden="true" />
                  ) : (
                    <Eye size={19} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className={styles['errorMessage']} role="alert">
                <AlertCircle size={20} aria-hidden="true" />
                <p>{typeof errorMessage === 'string' ? errorMessage : String(errorMessage)}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className={styles['submitButton']}
            >
              {isPending ? (
                <>
                  <Loader2 className={styles['spinner']} size={20} aria-hidden="true" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <span>Iniciar sesión</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>
          </form>



          {/* Footer */}
          <p className={`${styles['footer']} ${styles['animatedItem']}`}>
            ¿Problemas para acceder?{' '}
            <Link href="#" className={styles['footerLink']}>
              Contacta soporte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
