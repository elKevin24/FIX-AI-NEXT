import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getReportData } from '@/lib/report-actions';
import ReportsClient from './ReportsClient';

export const metadata = {
  title: 'Reportes',
  description: 'Visualiza estadísticas de tickets, facturación, inventario y rendimiento del taller.',
  openGraph: {
    title: 'Reportes | FIX Workshop',
    description: 'Visualiza estadísticas de tickets, facturación, inventario y rendimiento del taller.',
  },
};

export default async function ReportsPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  // Verificar permisos
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Initial load for last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const initialData = await getReportData(thirtyDaysAgo, today);

  return <ReportsClient initialData={initialData} />;
}
