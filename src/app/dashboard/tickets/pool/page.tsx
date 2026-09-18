import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TicketPoolView } from "@/components/tickets/TicketPoolView";
import { hasPermission } from "@/lib/auth-utils";
import type { UserRole } from "@prisma/client";

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

  // Only users with ticket taking permissions can access the pool
  if (!hasPermission(session.user.role as UserRole, 'canTakeTicket')) {
    redirect('/dashboard');
  }

  return <TicketPoolView session={session} />;
}
