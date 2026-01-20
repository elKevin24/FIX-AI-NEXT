import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getPOSSales, getPOSSalesStats } from '@/lib/pos-actions';
import SalesHistoryClient from './SalesHistoryClient';

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
