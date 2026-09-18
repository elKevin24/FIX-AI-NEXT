import { auth } from '@/auth';
import { isSuperAdmin } from '@/lib/authz';
import { isAdmin } from '@/lib/auth-utils';
import { redirect } from 'next/navigation';
import { WorkloadDashboard } from '@/components/technicians/WorkloadDashboard';

export const metadata = {
  title: 'Carga de Trabajo de Técnicos',
  description: 'Monitoreo de ocupación, límites concurrentes y asignaciones del equipo técnico.',
  openGraph: {
    title: 'Carga de Trabajo | FIX Workshop',
    description: 'Monitoreo de ocupación, límites concurrentes y asignaciones del equipo técnico.',
  },
};

export default async function WorkloadPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  // Only admins or superadmins can access this page
  if (!isAdmin(session.user.role as any) && !isSuperAdmin(session.user)) {
    redirect('/dashboard');
  }

  return <WorkloadDashboard />;
}
