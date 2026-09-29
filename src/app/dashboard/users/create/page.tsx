import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardBody, Button } from '@/components/ui';
import CreateUserForm from './CreateUserForm';
import PageHeader from '@/components/PageHeader';
import { hasPermission } from '@/lib/auth-utils';
import type { UserRole } from '@prisma/client';
import { ArrowLeft, UserPlus } from 'lucide-react';

export const metadata = {
  title: 'Nuevo Usuario',
  description: 'Crea una cuenta de técnico, recepcionista o administrador del taller.',
};

export default async function CreateUserPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  // Check permissions to create users
  if (!hasPermission(session.user.role as UserRole, 'canCreateUsers')) {
    redirect('/dashboard/users');
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Nuevo Usuario"
        subtitle="Crea una nueva cuenta de usuario para tu taller"
        actions={
          <Button
            as={Link}
            href="/dashboard/users"
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft size={16} aria-hidden="true" />}
          >
            Volver a Usuarios
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '2.25rem',
              height: '2.25rem',
              borderRadius: 'var(--radius-lg, 0.75rem)',
              background: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-200)',
              color: 'var(--color-primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <UserPlus size={18} aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Datos del Nuevo Usuario</CardTitle>
              <CardDescription>Asigna el nombre, correo, contraseña y rol de acceso</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <CreateUserForm />
        </CardBody>
      </Card>
    </div>
  );
}

