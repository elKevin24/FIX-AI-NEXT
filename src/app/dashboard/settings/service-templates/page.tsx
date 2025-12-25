import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import {  getServiceTemplates } from '@/lib/service-template-actions';
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
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-2">Acceso Denegado</h2>
          <p className="text-red-600 mb-4">
            Solo los administradores pueden gestionar plantillas de servicio.
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

  const templates = await getServiceTemplates();

  return (
    <div className={styles.container}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Plantillas de Servicio</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Gestiona plantillas para agilizar la creación de tickets
          </p>
        </div>
        <Link
          href="/dashboard/settings/service-templates/create"
          className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg text-sm md:text-base font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <span>+</span>
          Nueva Plantilla
        </Link>
      </div>

      <ServiceTemplateList templates={templates} />
    </div>
  );
}
