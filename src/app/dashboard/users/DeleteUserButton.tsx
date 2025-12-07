'use client';

import { Button } from '@/components/ui';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteUserButtonProps {
  userId: string;
  userName: string;
}

export default function DeleteUserButton({ userId, userName }: DeleteUserButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      router.refresh();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="danger"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
      style={{ flex: 1 }}
    >
      {isDeleting ? 'Deleting...' : 'Delete'}
    </Button>
  );
}
