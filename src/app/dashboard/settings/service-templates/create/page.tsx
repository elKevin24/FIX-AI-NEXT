import { auth } from '@/auth';
import { ServiceTemplateForm } from '../ServiceTemplateForm';
import PageHeader from '@/components/PageHeader';
import styles from './create.module.css';

export default async function CreateServiceTemplatePage() {
  const session = await auth();

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className={styles['errorContainer']}>
        <h2 className={styles['errorTitle']}>Acceso Denegado</h2>
        <p className={styles['errorMessage']}>
          Solo los administradores pueden crear plantillas de servicio.
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