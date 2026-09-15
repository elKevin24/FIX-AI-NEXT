import { auth } from '@/auth';
import { ServiceTemplateForm } from '../ServiceTemplateForm';
import styles from './create.module.css';

export default async function CreateServiceTemplatePage() {
  const session = await auth();

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className={styles.errorContainer}>
        <h2 className={styles.errorTitle}>Acceso Denegado</h2>
        <p className={styles.errorMessage}>
          Solo los administradores pueden crear plantillas de servicio.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Nueva Plantilla de Servicio</h1>
        <p className={styles.subtitle}>
          Crea una plantilla para estandarizar tus servicios más comunes.
        </p>
      </div>
      <div className={styles.card}>
        <ServiceTemplateForm />
      </div>
    </div>
  );
}