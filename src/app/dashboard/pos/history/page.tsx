import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getPOSSales, getPOSSalesStats } from '@/lib/pos-actions';
import SalesHistoryClient from './SalesHistoryClient';

export const metadata = {
  title: 'Historial de Ventas',
  description: 'Consulta el historial completo de ventas de mostrador del taller.',
};

export default async function SalesHistoryPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const [sales, stats] = await Promise.all([
        getPOSSales(),
        getPOSSalesStats(),
    ]);

    return <SalesHistoryClient initialSales={sales} stats={stats} />;
}
