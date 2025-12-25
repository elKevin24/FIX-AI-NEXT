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
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <Link
          href="/dashboard/settings/service-templates"
          className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
          ← Volver a plantillas
        </Link>
      </div>

      <div className="space-y-6">
        {/* Template Form */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Editar Plantilla</h1>
              <p className="text-gray-600">
                {template._count.tickets > 0 && (
                  <span className="text-sm text-yellow-700 bg-yellow-50 px-3 py-1 rounded">
                    ⚠️ Esta plantilla tiene {template._count.tickets} tickets asociados
                  </span>
                )}
              </p>
            </div>
          </div>

          <ServiceTemplateForm initialData={template} />
        </div>

        {/* Parts Manager */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <TemplatePartsManager templateId={id} defaultParts={template.defaultParts} />
        </div>
      </div>
    </div>
  );
}
