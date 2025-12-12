import Link from 'next/link';
import { signOut } from '@/auth';
import styles from './dashboard.module.css';
import GlobalSearch from '@/components/GlobalSearch';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon} />
                    <h2>FIX-AI</h2>
                </div>
                <nav className={styles.nav}>
                    <Link href="/dashboard" className={styles.navLink}>Inicio</Link>
                    <Link href="/dashboard/tickets" className={styles.navLink}>Tickets</Link>
                    <Link href="/dashboard/customers" className={styles.navLink}>Clientes</Link>
                    <Link href="/dashboard/users" className={styles.navLink}>Usuarios</Link>
                    <Link href="/dashboard/settings" className={styles.navLink}>Configuración</Link>
                </nav>
                <div className={styles.userProfile}>
                    <form
                        action={async () => {
                            'use server';
                            await signOut();
                        }}
                    >
                        <button className={styles.logoutBtn}>Cerrar Sesión</button>
                    </form>
                </div>
            </aside>
            <main className={styles.mainContent}>
                <div className={styles.searchBar}>
                    <GlobalSearch />
                </div>
                {children}
            </main>
        </div>
    );
}
