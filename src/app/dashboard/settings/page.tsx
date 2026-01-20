import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import styles from '../page.module.css';

export default async function SettingsPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <h1>Configuración</h1>
            </header>

            <div className={styles.statsGrid}>
                <div className={styles.card}>
                    <h3>Información del Usuario</h3>
                    <div style={{ marginTop: '1rem' }}>
                        <p><strong>Nombre:</strong> {session.user.name || 'N/A'}</p>
                        <p><strong>Email:</strong> {session.user.email}</p>
                        <p><strong>Rol:</strong> {session.user.role}</p>
                    </div>
                </div>

                <div className={styles.card}>
                    <h3>Información del Tenant</h3>
                    <div style={{ marginTop: '1rem' }}>
                        <p><strong>Tenant ID:</strong> {session.user.tenantId}</p>
                    </div>
                </div>

                <Link href="/dashboard/settings/business" className={styles.card} style={{ textDecoration: 'none' }}>
                    <h3>Datos del Negocio</h3>
                    <div style={{ marginTop: '1rem' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Configura el nombre, NIT, dirección y datos fiscales de tu negocio para facturas y documentos.
                        </p>
                        <p style={{ color: 'var(--primary)', marginTop: '0.5rem' }}>
                            Configurar &rarr;
                        </p>
                    </div>
                </Link>

                {session.user.role === 'ADMIN' && (
                    <Link href="/dashboard/settings/service-templates" className={styles.card} style={{ textDecoration: 'none' }}>
                        <h3>Plantillas de Servicio</h3>
                        <div style={{ marginTop: '1rem' }}>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                Administra las plantillas de servicio predefinidas para crear tickets rápidamente.
                            </p>
                            <p style={{ color: 'var(--primary)', marginTop: '0.5rem' }}>
                                Administrar &rarr;
                            </p>
                        </div>
                    </Link>
                )}
            </div>
        </div>
    );
}
