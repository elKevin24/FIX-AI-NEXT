import { auth } from '@/auth';
import { isSuperAdmin } from '@/lib/authz';
import { redirect } from 'next/navigation';
import { WorkloadDashboard } from '@/components/technicians/WorkloadDashboard';

export default async function WorkloadPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  // Only admins or superadmins can access this page
  if (session.user.role !== 'ADMIN' && !isSuperAdmin(session.user)) {
    redirect('/dashboard');
  }

  return <WorkloadDashboard />;
}
