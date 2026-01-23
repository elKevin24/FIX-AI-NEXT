import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getServiceTemplates } from '@/lib/service-template-actions';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { ServiceTemplateList } from './ServiceTemplateList';
import styles from './service-templates.module.css';

export const metadata = {
  title: 'Plantillas de Servicio | Dashboard',
  description: 'Administración de plantillas de servicio',
};

export default async function ServiceTemplatesPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Solo ADMIN puede acceder a esta página
  if (session.user.role !== 'ADMIN') {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <h2 className={styles.errorTitle}>Acceso Denegado</h2>
          <p className={styles.errorMessage}>
            Solo los administradores pueden gestionar plantillas de servicio.
          </p>
          <Button as={Link} href="/dashboard" variant="primary">
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const templates = await getServiceTemplates();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Plantillas de Servicio</h1>
          <p>
            Gestiona plantillas para agilizar la creación de tickets
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button as={Link} href="/dashboard/settings/service-templates/analytics" variant="secondary">
            📊 Analytics
          </Button>
          <Button as={Link} href="/dashboard/settings/service-templates/create" variant="primary">
            + Nueva Plantilla
          </Button>
        </div>
      </div>

      <ServiceTemplateList templates={templates} />
    </div>
  );
}