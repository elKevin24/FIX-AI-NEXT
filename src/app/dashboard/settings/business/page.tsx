import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTenantSettings } from '@/lib/tenant-settings-actions';
import BusinessSettingsForm from './BusinessSettingsForm';
import styles from './business.module.css';

export default async function BusinessSettingsPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const settings = await getTenantSettings();

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Configuración del Negocio</h1>
                <p className={styles.subtitle}>
                    Configura los datos de tu negocio que aparecerán en facturas, recibos y otros documentos.
                </p>
            </header>

            <BusinessSettingsForm initialSettings={settings} />
        </div>
    );
}
