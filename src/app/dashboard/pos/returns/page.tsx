import { getCreditNotes, getCreditNoteStats } from '@/lib/credit-note-actions';
import { ReturnsClient } from './ReturnsClient';

export const metadata = {
  title: 'Devoluciones',
  description: 'Gestiona notas de crédito y devoluciones de ventas de mostrador.',
};

export const dynamic = 'force-dynamic';

export default async function ReturnsPage() {
    const [creditNotes, stats] = await Promise.all([
        getCreditNotes(),
        getCreditNoteStats(),
    ]);

    return (
        <ReturnsClient
            initialCreditNotes={creditNotes}
            stats={stats}
        />
    );
}
