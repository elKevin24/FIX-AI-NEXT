'use client';

import { useActionState } from 'react';
import { createUser } from '@/lib/actions';
import styles from '../../tickets/tickets.module.css';
import Link from 'next/link';

export default function CreateUserPage() {
    const [state, formAction, isPending] = useActionState(createUser, null);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Crear Nuevo Usuario</h1>
                <Link href="/dashboard/users" className={styles.viewLink}>
                    &larr; Volver a usuarios
                </Link>
            </div>

            <div className={styles.tableContainer} style={{ padding: '2rem' }}>
                <form action={formAction} className="flex flex-col gap-4 max-w-lg">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="name">Nombre</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            placeholder="Nombre completo"
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            placeholder="usuario@ejemplo.com"
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            minLength={6}
                            placeholder="Mínimo 6 caracteres"
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="role">Rol</label>
                        <select
                            id="role"
                            name="role"
                            required
                            className="p-2 border rounded text-black"
                            defaultValue=""
                        >
                            <option value="" disabled>Selecciona un rol</option>
                            <option value="ADMIN">Administrador</option>
                            <option value="TECHNICIAN">Técnico</option>
                            <option value="RECEPTIONIST">Recepcionista</option>
                        </select>
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
                            {isPending ? 'Creando...' : 'Crear Usuario'}
                        </button>
                        <Link
                            href="/dashboard/users"
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
import CreateUserForm from './CreateUserForm';

export default async function CreateUserPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  // Only ADMIN can create users
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard/users');
  }

  return (
    <div style={{ padding: 'var(--spacing-6)', maxWidth: '600px', margin: '0 auto' }}>
      <Card>
        <CardHeader>
          <CardTitle>Add New User</CardTitle>
          <p className="text-secondary" style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-2)' }}>
            Create a new user account for your workshop
          </p>
        </CardHeader>
        <CardBody>
          <CreateUserForm />
        </CardBody>
      </Card>
    </div>
  );
}
