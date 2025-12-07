'use client';

import { useActionState } from 'react';
import { createCustomer } from '@/lib/actions';
import styles from '../../tickets/tickets.module.css';
import Link from 'next/link';

export default function CreateCustomerPage() {
    const [state, formAction, isPending] = useActionState(createCustomer, null);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Nuevo Cliente</h1>
                <Link href="/dashboard/customers" className={styles.viewLink}>
                    &larr; Volver a clientes
                </Link>
            </div>

            <div className={styles.tableContainer} style={{ padding: '2rem' }}>
                <form action={formAction} className="flex flex-col gap-4 max-w-lg">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="name">Nombre *</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            placeholder="Nombre completo del cliente"
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="cliente@ejemplo.com"
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="phone">Teléfono</label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder="+52 555 123 4567"
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="address">Dirección</label>
                        <textarea
                            id="address"
                            name="address"
                            rows={2}
                            placeholder="Calle, número, colonia, ciudad..."
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <div aria-live="polite">
                        {state?.message && (
                            <p className="text-red-500 bg-red-50 p-2 rounded border border-red-200">
                                {state.message}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            type="submit"
                            className={styles.createBtn}
                            disabled={isPending}
                        >
                            {isPending ? 'Creando...' : 'Crear Cliente'}
                        </button>
                        <Link
                            href="/dashboard/customers"
                            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                        >
                            Cancelar
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui';
import CreateCustomerForm from './CreateCustomerForm';

export default async function CreateCustomerPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  return (
    <div style={{ padding: 'var(--spacing-6)', maxWidth: '600px', margin: '0 auto' }}>
      <Card>
        <CardHeader>
          <CardTitle>Add New Customer</CardTitle>
          <p className="text-secondary" style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-2)' }}>
            Create a new customer record
          </p>
        </CardHeader>
        <CardBody>
          <CreateCustomerForm />
        </CardBody>
      </Card>
    </div>
  );
}
