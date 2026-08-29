import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServiceTemplate } from '@/lib/service-template-actions';
import { ServiceTemplateForm } from '../../ServiceTemplateForm';
import { TemplatePartsManager } from '../../TemplatePartsManager';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import styles from '../../service-templates.module.css';

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

  if (session.user.role !== 'ADMIN') {
    return (
      <div className={styles['container']}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-2">Acceso Denegado</h2>
          <p className="text-red-600 mb-4">
            Solo los administradores pueden editar plantillas.
          </p>
          <Button
            as={Link}
            href="/dashboard"
            variant="primary"
          >
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const template = await getServiceTemplate(id);

  return (
    <div className={`${styles['container']} max-w-5xl`}>
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

      <div className="space-y-4">
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
