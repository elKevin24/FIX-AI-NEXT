'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { createCustomer } from '@/lib/actions';
import { Input, Textarea, Button, Alert } from '@/components/ui';
import styles from '@/components/ui/Form.module.css';

export default function CreateCustomerForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createCustomer, null);

  return (
    <form action={formAction}>
      {state?.message && (
        <Alert variant="error">
          {state.message}
        </Alert>
      )}

      <Input
        label="Customer Name"
        name="name"
        type="text"
        placeholder="John Doe"
        required
      />

      <Input
        label="Email Address"
        name="email"
        type="email"
        placeholder="john@example.com"
        helper="Optional - for sending notifications"
      />

      <Input
        label="Phone Number"
        name="phone"
        type="tel"
        placeholder="+1 (555) 123-4567"
        helper="Optional"
      />

      <div className={styles['formRow']}>
        <Input
          label="DPI (ID)"
          name="dpi"
          type="text"
          placeholder="1234 56789 0101"
          helper="Optional"
        />
        <Input
          label="NIT (Tax ID)"
          name="nit"
          type="text"
          placeholder="123456-7"
          helper="Optional"
        />
      </div>

      <Textarea
        label="Address"
        name="address"
        placeholder="123 Main St, City, State 12345"
        helper="Optional"
        rows={3}
      />

      <div className={styles['actions']}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isPending}
          isLoading={isPending}
        >
          Create Customer
        </Button>
      </div>
    </form>
  );
}
