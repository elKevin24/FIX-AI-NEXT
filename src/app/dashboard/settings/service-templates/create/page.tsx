import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ServiceTemplateForm } from '../ServiceTemplateForm';

export const metadata = {
  title: 'Nueva Plantilla de Servicio | Dashboard',
};

export default async function CreateServiceTemplatePage() {
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
            Solo los administradores pueden crear plantillas.
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/dashboard/settings/service-templates"
          className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
          ← Volver a plantillas
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Nueva Plantilla de Servicio</h1>
        <p className="text-gray-600 mb-6">
          Crea una plantilla para agilizar la creación de tickets recurrentes
        </p>

        <ServiceTemplateForm />
      </div>
    </div>
  );
}
