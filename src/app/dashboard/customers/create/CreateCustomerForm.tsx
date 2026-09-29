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
    <form action={formAction} className="flex flex-col gap-4">
      {state?.message && (
        <Alert variant="error">
          {state.message}
        </Alert>
      )}

      <Input
        label="Nombre Completo *"
        name="name"
        type="text"
        placeholder="Ej: Juan Pérez"
        required
      />

      <div className={styles['formRow']}>
        <Input
          label="📧 Correo Electrónico"
          name="email"
          type="email"
          placeholder="cliente@ejemplo.com"
          helper="Opcional - para enviar notificaciones"
        />

        <Input
          label="📱 Teléfono"
          name="phone"
          type="tel"
          placeholder="+502 5555-1234"
          helper="Opcional"
        />
      </div>

      <div className={styles['formRow']}>
        <Input
          label="🆔 DPI (Identificación)"
          name="dpi"
          type="text"
          placeholder="1234 56789 0101"
          helper="Opcional"
        />
        <Input
          label="📄 NIT (Tributario)"
          name="nit"
          type="text"
          placeholder="123456-7"
          helper="Opcional"
        />
      </div>

      <Textarea
        label="📍 Dirección"
        name="address"
        placeholder="Dirección completa del cliente..."
        helper="Opcional"
        rows={3}
      />

      <div className={styles['actions']}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isPending}
          isLoading={isPending}
        >
          Crear Cliente
        </Button>
      </div>
    </form>
  );
}

