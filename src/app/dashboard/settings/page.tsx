import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import styles from '../page.module.css';

export default async function SettingsPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <h1>Settings</h1>
            </header>

            <div className={styles.statsGrid}>
                <div className={styles.card}>
                    <h3>User Information</h3>
                    <div style={{ marginTop: '1rem' }}>
                        <p><strong>Name:</strong> {session.user.name || 'N/A'}</p>
                        <p><strong>Email:</strong> {session.user.email}</p>
                        <p><strong>Role:</strong> {session.user.role}</p>
                    </div>
                </div>

                <div className={styles.card}>
                    <h3>Tenant Information</h3>
                    <div style={{ marginTop: '1rem' }}>
                        <p><strong>Tenant ID:</strong> {session.user.tenantId}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
