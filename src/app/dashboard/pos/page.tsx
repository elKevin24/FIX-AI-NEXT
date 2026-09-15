import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getPartsForPOS, getCustomersForPOS } from '@/lib/pos-actions';
import { getTenantSettings } from '@/lib/tenant-settings-actions';
import POSClient from './POSClient';
import { serializeDecimal } from '@/lib/utils';

export default async function POSPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    // Fetch initial data
    const [parts, customers, settings] = await Promise.all([
        getPartsForPOS(),
        getCustomersForPOS(),
        getTenantSettings(),
    ]);

    const serializedSettings = serializeDecimal(settings);

    return (
        <POSClient
            initialParts={parts}
            initialCustomers={customers}
            taxRate={serializedSettings?.taxRate ?? 12}
            currency={serializedSettings?.currency ?? 'GTQ'}
        />
    );
}
