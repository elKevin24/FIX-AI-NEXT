import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTemplateAnalytics } from '@/lib/service-template-actions';
import TemplateAnalyticsClient from './TemplateAnalyticsClient';
import { hasPermission } from '@/lib/auth-utils';
import type { UserRole } from '@prisma/client';

export const metadata = {
  title: 'Analytics de Plantillas',
  description: 'Métricas de uso, frecuencia y rendimiento de las plantillas de servicio del taller.',
  openGraph: {
    title: 'Analytics de Plantillas | FIX Workshop',
    description: 'Métricas de uso, frecuencia y rendimiento de las plantillas de servicio del taller.',
  },
};

export default async function TemplateAnalyticsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  if (!hasPermission(session.user.role as UserRole, 'canManageTemplates')) {
    redirect('/dashboard');
  }

  // Initial load for last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const initialData = await getTemplateAnalytics(thirtyDaysAgo, today);

  return <TemplateAnalyticsClient initialData={initialData} />;
}
