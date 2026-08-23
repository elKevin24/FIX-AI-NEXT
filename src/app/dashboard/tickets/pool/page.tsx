import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TicketPoolView } from "@/components/tickets/TicketPoolView";

export const metadata = {
  title: 'Pool de Tickets',
  description: 'Tickets disponibles para asignación y atención técnica inmediata.',
  openGraph: {
    title: 'Pool de Tickets | FIX Workshop',
    description: 'Tickets disponibles para asignación y atención técnica inmediata.',
  },
};

export default async function TicketPoolPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  // Only technicians and admins can access the pool
  if (session.user.role !== 'TECHNICIAN' && session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return <TicketPoolView session={session} />;
}
