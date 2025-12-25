import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServiceTemplate } from '@/lib/service-template-actions';
import { ServiceTemplateForm } from '../../ServiceTemplateForm';
import { TemplatePartsManager } from '../../TemplatePartsManager';

export const metadata = {
  title: 'Editar Plantilla de Servicio | Dashboard',
};

export default async function EditServiceTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-2">Acceso Denegado</h2>
          <p className="text-red-600 mb-4">
            Solo los administradores pueden editar plantillas.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const template = await getServiceTemplate(id);

  return (
    <div className="container mx-auto px-4 py-4 md:py-6 max-w-5xl">
      {/* Back Link */}
      <Link
        href="/dashboard/settings/service-templates"
        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 mb-4"
      >
        ← Volver a plantillas
      </Link>

      <div className="space-y-4">
        {/* Template Form */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Editar Plantilla</h1>
            {template._count.tickets > 0 && (
              <span className="inline-block text-xs md:text-sm text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                ⚠️ Esta plantilla tiene {template._count.tickets} tickets asociados
              </span>
            )}
          </div>

          <ServiceTemplateForm initialData={template} />
        </div>

        {/* Parts Manager */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
          <TemplatePartsManager templateId={id} defaultParts={template.defaultParts} />
        </div>
      </div>
    </div>
  );
}
