import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTemplateAnalytics } from '@/lib/service-template-actions';
import TemplateAnalyticsClient from './TemplateAnalyticsClient';

export const metadata = {
  title: 'Analytics de Plantillas | Dashboard',
  description: 'Métricas y estadísticas de uso de plantillas de servicio',
};

export default async function TemplateAnalyticsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Initial load for last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const initialData = await getTemplateAnalytics(thirtyDaysAgo, today);

  return <TemplateAnalyticsClient initialData={initialData} />;
}
