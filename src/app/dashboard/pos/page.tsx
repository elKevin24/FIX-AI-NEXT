import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getPartsForPOS, getCustomersForPOS } from '@/lib/pos-actions';
import { getTenantSettings } from '@/lib/tenant-settings-actions';
import POSClient from './POSClient';

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

    return (
        <POSClient
            initialParts={parts}
            initialCustomers={customers}
            taxRate={settings?.taxRate ?? 12}
            currency={settings?.currency ?? 'GTQ'}
        />
    );
}
