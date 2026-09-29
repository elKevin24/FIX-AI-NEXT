import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServiceTemplate } from '@/lib/service-template-actions';
import { ServiceTemplateForm } from '../../ServiceTemplateForm';
import { TemplatePartsManager } from '../../TemplatePartsManager';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, Alert } from '@/components/ui';
import styles from '../../service-templates.module.css';
import { hasPermission } from '@/lib/auth-utils';
import type { UserRole } from '@prisma/client';

export const metadata = {
  title: 'Editar Plantilla de Servicio',
  description: 'Modifica los datos, partes y configuración de una plantilla de servicio existente.',
  openGraph: {
    title: 'Editar Plantilla de Servicio | FIX Workshop',
    description: 'Modifica los datos, partes y configuración de una plantilla de servicio existente.',
  },
};

export default async function EditServiceTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  if (!hasPermission(session.user.role as UserRole, 'canManageTemplates')) {
    return (
      <div className={styles['container']}>
        <Alert variant="error">
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Acceso Denegado</h2>
            <p style={{ marginBottom: '1rem' }}>
              No tienes permisos para editar plantillas.
            </p>
            <Button
              as={Link}
              href="/dashboard"
              variant="primary"
            >
              Volver al Dashboard
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  const template = await getServiceTemplate(id);

  return (
    <div className={styles['container']} style={{ maxWidth: '64rem' }}>
      <PageHeader
        title="Editar Plantilla de Servicio"
        subtitle={`Configuración de la plantilla: ${template.name}`}
        actions={
          <Button
            as={Link}
            href="/dashboard/settings/service-templates"
            variant="secondary"
            size="sm"
            leftIcon={<span>←</span>}
          >
            Volver a Plantillas
          </Button>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Template Form */}
        <div className={`${styles['glassCard']} ${styles['slideUp']}`}>
          {template._count.tickets > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <span className={styles['warningBadge']}>
                ⚠️ Esta plantilla tiene {template._count.tickets} tickets asociados
              </span>
            </div>
          )}

          <ServiceTemplateForm initialData={template} />
        </div>

        {/* Parts Manager */}
        <div className={`${styles['glassCard']} ${styles['slideUp']}`}>
          <TemplatePartsManager templateId={id} defaultParts={template.defaultParts} />
        </div>
      </div>
    </div>
  );
}
