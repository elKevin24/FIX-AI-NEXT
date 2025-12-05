import Link from 'next/link';
import { signOut } from '@/auth';
import styles from './dashboard.module.css';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <h2>Workshop App</h2>
                </div>
                <nav className={styles.nav}>
                    <Link href="/dashboard" className={styles.navLink}>Overview</Link>
                    <Link href="/dashboard/tickets" className={styles.navLink}>Tickets</Link>
                    <Link href="/dashboard/customers" className={styles.navLink}>Customers</Link>
                    <Link href="/dashboard/users" className={styles.navLink}>Users</Link>
                    <Link href="/dashboard/settings" className={styles.navLink}>Settings</Link>
                </nav>
                <div className={styles.userProfile}>
                    <form
                        action={async () => {
                            'use server';
                            await signOut();
                        }}
                    >
                        <button className={styles.logoutBtn}>Sign Out</button>
                    </form>
                </div>
            </aside>
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
