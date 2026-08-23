import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getPartsForPOS, getCustomersForPOS } from '@/lib/pos-actions';
import { getTenantSettings } from '@/lib/tenant-settings-actions';
import POSClient from './POSClient';
import { serializeDecimal } from '@/lib/utils';

export const metadata = {
    title: 'Punto de Venta (POS)',
    description: 'Ventas directas de mostrador, cobros rápidos y emisión de tickets.',
    openGraph: {
        title: 'Punto de Venta | FIX Workshop',
        description: 'Ventas directas de mostrador, cobros rápidos y emisión de tickets.',
    },
};

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
