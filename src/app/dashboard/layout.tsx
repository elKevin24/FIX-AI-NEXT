import { signOut, auth } from '@/auth';
import styles from './dashboard.module.css';
import Sidebar from '@/components/dashboard/Sidebar';
import TopNav from '@/components/dashboard/TopNav';
import { ToastProvider } from '@/context/ToastContext';
import ToastContainer from '@/components/ui/ToastContainer';
// We don't import Sidebar.module.css here, the component handles it.

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    // Logout button passed as a server component/slot to client component
    const logoutButton = (
        <form
            action={async () => {
                'use server';
                await signOut();
            }}
            style={{ width: '100%' }}
        >
            <button 
                style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'rgba(255, 255, 255, 0.3)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    color: '#dc2626',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Cerrar Sesión
            </button>
        </form>
    );

    return (
        <ToastProvider>
            <div className={styles.container}>
                <Sidebar logoutButton={logoutButton} userRole={session?.user?.role} />
                <main className={styles.mainContent}>
                    <TopNav />
                    {children}
                </main>
                <ToastContainer />
            </div>
        </ToastProvider>
    );
}