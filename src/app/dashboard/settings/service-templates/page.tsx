import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getServiceTemplates } from '@/lib/service-template-actions';
import Link from 'next/link';
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
          <Link
            href="/dashboard"
            className={styles.mainCreateBtn}
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const templates = await getServiceTemplates();

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Plantillas de Servicio</h1>
          <p className={styles.pageSubtitle}>
            Gestiona plantillas para agilizar la creación de tickets
          </p>
        </div>
        <Link
          href="/dashboard/settings/service-templates/create"
          className={styles.mainCreateBtn}
        >
          <span>+</span>
          Nueva Plantilla
        </Link>
      </div>

      <ServiceTemplateList templates={templates} />
    </div>
  );
}