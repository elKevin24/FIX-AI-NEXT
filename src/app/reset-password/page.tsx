'use client';

import { useActionState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { resetPassword } from '@/lib/actions/auth-actions';
import styles from '@/app/login/login.module.css';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    return await resetPassword(formData);
  }, undefined);

  if (!token) {
    return (
      <div className={`${styles['form']} ${styles['animatedItem']}`}>
        <div className={styles['errorMessage']} role="alert">
          El enlace es inválido o falta el token de seguridad.
        </div>
        <Link href="/login" className={styles['submitButton']} style={{ textAlign: 'center', display: 'block', textDecoration: 'none' }}>
          Volver a Login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className={`${styles['form']} ${styles['animatedItem']}`}>
      <input type="hidden" name="token" value={token} />
      
      <div className={styles['inputGroup']}>
        <label htmlFor="password" className={styles['label']}>
          Nueva Contraseña
        </label>
        <div className={styles['inputWrapper']}>
          <input
            id="password"
            type="password"
            name="password"
            placeholder="Min. 6 caracteres"
            required
            minLength={6}
            className={styles['input']}
          />
        </div>
      </div>

      {state?.error && (
        <div className={styles['errorMessage']} role="alert">
          {state.error}
        </div>
      )}
      
      {state?.success && (
        <div className={styles['errorMessage']} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }} role="alert">
          {state.success}
        </div>
      )}

      {state?.success ? (
        <Link href="/login" className={styles['submitButton']} style={{ textAlign: 'center', display: 'block', textDecoration: 'none' }}>
          Iniciar Sesión
        </Link>
      ) : (
        <button
          type="submit"
          disabled={isPending}
          className={styles['submitButton']}
        >
          {isPending ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
        </button>
      )}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className={styles['container']}>
      {/* Decorative Blobs */}
      <div className={styles['decorativeBlobs']}>
        <div className={styles['blob']} />
        <div className={styles['blob']} />
        <div className={styles['blob']} />
      </div>

      <div className={styles['contentWrapper']}>
        {/* Card */}
        <div className={styles['loginCard']}>
          <div className={`${styles['brandHeader']} ${styles['animatedItem']}`}>
            <h1 className={styles['brandTitle']}>Actualiza tu Contraseña</h1>
            <p className={styles['brandSubtitle']}>
              Ingresa una nueva contraseña segura
            </p>
          </div>

          <Suspense fallback={<p style={{color: 'white', textAlign: 'center'}}>Cargando formulario...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
