import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { WorkloadDashboard } from '@/components/technicians/WorkloadDashboard';

export default async function WorkloadPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  // Only admins can access this page
  if (session.user.role !== 'ADMIN' && session.user.email !== 'adminkev@example.com') {
    redirect('/dashboard');
  }

  return <WorkloadDashboard />;
}
