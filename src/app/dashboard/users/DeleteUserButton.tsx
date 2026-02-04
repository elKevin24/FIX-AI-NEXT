'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deactivateUser, reactivateUser } from '@/lib/user-actions';
import styles from './users.module.css';

interface DeleteUserButtonProps {
  userId: string;
  userName: string;
  isActive?: boolean;
  className?: string;
}

export default function DeleteUserButton({
  userId,
  userName,
  isActive = true,
  className
}: DeleteUserButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleToggleActive = async () => {
    const action = isActive ? 'desactivar' : 'reactivar';
    const confirmMessage = isActive
      ? `¿Estás seguro de desactivar a ${userName}? El usuario no podrá iniciar sesión.`
      : `¿Estás seguro de reactivar a ${userName}? El usuario podrá volver a iniciar sesión.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('userId', userId);

      const result = isActive
        ? await deactivateUser({ success: false, message: '' }, formData)
        : await reactivateUser({ success: false, message: '' }, formData);

      if (!result.success) {
        throw new Error(result.message);
      }

      router.refresh();
    } catch (error) {
      console.error(`Error ${action} user:`, error);
      alert(error instanceof Error ? error.message : `Error al ${action} usuario`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isActive) {
    return (
      <button
        onClick={handleToggleActive}
        disabled={isLoading}
        className={`${className || ''} ${styles.btnDelete}`}
        title={isLoading ? 'Procesando...' : 'Desactivar Usuario'}
      >
        {isLoading ? (
          <span className={styles.spinner} />
        ) : (
          <>
            <BanIcon />
            Desactivar
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggleActive}
      disabled={isLoading}
      className={`${className || ''} ${styles.btnReactivate}`}
      title={isLoading ? 'Procesando...' : 'Reactivar Usuario'}
    >
      {isLoading ? (
        <span className={styles.spinner} />
      ) : (
        <>
          <CheckIcon />
          Reactivar
        </>
      )}
    </button>
  );
}

function BanIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M4.93 4.93l14.14 14.14"></path>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}
