import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getInvoiceById } from '@/lib/invoice-actions';
import InvoiceDetailClient from './InvoiceDetailClient';

export const metadata = {
  title: 'Detalle de Factura',
  description: 'Consulta los detalles, ítems y estado de pago de una factura específica.',
  openGraph: {
    title: 'Detalle de Factura | FIX Workshop',
    description: 'Consulta los detalles, ítems y estado de pago de una factura específica.',
  },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  const invoice = await getInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  return <InvoiceDetailClient invoice={invoice as any} />;
}
