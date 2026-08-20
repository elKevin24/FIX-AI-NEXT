import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getInvoices } from '@/lib/invoice-actions';
import InvoicesClient from './InvoicesClient';

export const metadata = {
  title: 'Facturación',
  description: 'Gestiona facturas, pagos y notas de crédito de tu taller electromecánico.',
  openGraph: {
    title: 'Facturación | FIX Workshop',
    description: 'Gestiona facturas, pagos y notas de crédito de tu taller electromecánico.',
  },
};

export default async function InvoicesPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  // Cargar facturas iniciales (últimos 30 días o todas)
  const initialInvoices = await getInvoices();

  return <InvoicesClient initialInvoices={initialInvoices as any[]} />;
}
