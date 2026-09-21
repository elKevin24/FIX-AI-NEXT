import { auth } from '@/auth';
import { ServiceTemplateForm } from '../ServiceTemplateForm';
import PageHeader from '@/components/PageHeader';
import styles from './create.module.css';
import { hasPermission } from '@/lib/auth-utils';
import type { UserRole } from '@prisma/client';

export const metadata = {
  title: 'Nueva Plantilla de Servicio',
  description: 'Define una plantilla de servicio con partes, costos y duración estimada.',
};

export default async function CreateServiceTemplatePage() {
  const session = await auth();

  if (!session?.user || !hasPermission(session.user.role as UserRole, 'canManageTemplates')) {
    return (
      <div className={styles['errorContainer']}>
        <h2 className={styles['errorTitle']}>Acceso Denegado</h2>
        <p className={styles['errorMessage']}>
          No tienes permisos para crear plantillas de servicio.
        </p>
      </div>
    );
  }

  return (
    <div className={styles['container']}>
      <PageHeader
        title="Nueva Plantilla de Servicio"
        subtitle="Crea una plantilla para estandarizar tus servicios más comunes."
      />
      <div className={styles['card']}>
        <ServiceTemplateForm />
      </div>
    </div>
  );
}