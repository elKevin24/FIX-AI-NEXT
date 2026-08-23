import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTenantSettings } from '@/lib/tenant-settings-actions';
import BusinessSettingsForm from './BusinessSettingsForm';
import PageHeader from '@/components/PageHeader';
import styles from './business.module.css';

export const metadata = {
    title: 'Datos del Negocio',
    description: 'Configuración fiscal, logotipo, dirección y datos comerciales del taller.',
    openGraph: {
        title: 'Datos del Negocio | FIX Workshop',
        description: 'Configuración fiscal, logotipo, dirección y datos comerciales del taller.',
    },
};

export default async function BusinessSettingsPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const settings = await getTenantSettings();

    return (
        <div className={styles['container']}>
            <PageHeader
                title="Configuración del Negocio"
                subtitle="Configura los datos de tu negocio que aparecerán en facturas, recibos y otros documentos."
            />

            <BusinessSettingsForm initialSettings={settings} />
        </div>
    );
}
