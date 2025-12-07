'use client';

import { Button } from '@/components/ui';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteCustomerButtonProps {
  customerId: string;
  customerName: string;
}

export default function DeleteCustomerButton({ customerId, customerName }: DeleteCustomerButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${customerName}? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete customer');
      }

      router.refresh();
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete customer');
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
