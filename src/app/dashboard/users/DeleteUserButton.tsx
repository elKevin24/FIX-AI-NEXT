'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './users.module.css';

interface DeleteUserButtonProps {
  userId: string;
  userName: string;
  className?: string;
}

export default function DeleteUserButton({ userId, userName, className }: DeleteUserButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de eliminar a ${userName}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar usuario');
      }

      router.refresh();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error instanceof Error ? error.message : 'Error al eliminar usuario');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className={`${className} ${styles.btnDelete}`}
      title={isDeleting ? 'Eliminando...' : 'Eliminar Usuario'}
    >
      {isDeleting ? (
        <span className={styles.spinner} />
      ) : (
        <>
          <TrashIcon />
          Borrar
        </>
      )}
    </button>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"></path>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  );
}
