import { getQuotations, getQuotationStats, markExpiredQuotations } from '@/lib/quotation-actions';
import { getPartsForPOS, getCustomersForPOS } from '@/lib/pos-actions';
import { getTenantSettings } from '@/lib/tenant-settings-actions';
import { QuotationsClient } from './QuotationsClient';

export const dynamic = 'force-dynamic';

export default async function QuotationsPage() {
    // Mark expired quotations on page load
    await markExpiredQuotations();

    const [quotations, stats, parts, customers, settings] = await Promise.all([
        getQuotations(),
        getQuotationStats(),
        getPartsForPOS(),
        getCustomersForPOS(),
        getTenantSettings(),
    ]);

    return (
        <QuotationsClient
            initialQuotations={quotations}
            stats={stats}
            parts={parts}
            customers={customers}
            taxRate={settings?.taxRate ? Number(settings.taxRate) : 12}
        />
    );
}
