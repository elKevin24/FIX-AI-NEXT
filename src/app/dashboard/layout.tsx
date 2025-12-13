import { signOut } from '@/auth';
import styles from './dashboard.module.css';
import Sidebar from '@/components/dashboard/Sidebar';
// We don't import Sidebar.module.css here, the component handles it.

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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
                // We use a simple inline style or utility class to ensure it matches
                // but since the CSS module for Sidebar is in the client component, 
                // we might need to rely on the class being applied inside the sidebar.
                // Actually, the Sidebar component applies styles.logoutBtn to the container of this button
                // or we can style the button itself here.
                // Let's check Sidebar.tsx again. It accepts ReactNode.
                // The CSS class .logoutBtn is defined in Sidebar.module.css
                // But this button is rendered here. 
                // So we need to style it here or pass a class.
                // Solution: Make the button plain here, and the Sidebar component can wrap it 
                // OR we can't easily use the Sidebar module class here.
                // Better: Just use an inline style or global class, or define a small style here.
                // OR, simplest: Sidebar renders the form? No, server action issue.
                // Actually, I can render the button in Sidebar and just pass the ACTION function?
                // No, actions must be passed to forms or event handlers.
                
                // Let's look at Sidebar.tsx again.
                // <div className={styles.userProfile}>{logoutButton}</div>
                // The styles.logoutBtn in Sidebar.module.css targets the button class.
                // Since I cannot apply `styles.logoutBtn` from Sidebar.module.css here (it's a different file),
                // I will add the class name manually "logout-btn-global" and style it globally or 
                // just inline the styles for now to ensure it looks right.
                // WAIT: I can just import the Sidebar styles? No.
                
                // Alternative: The Sidebar component exposes a `LogoutButton` wrapper?
                // No.
                
                // Best approach: 
                // Just use inline styles that mimic the CSS for now, or a simple global class.
                // or just `className="w-full text-left ..."` if tailwind.
                // I'll stick to a simple inline style for the button to ensure it looks okay,
                // or just rely on the Sidebar component to cloneElement and add the class?
                // No, too complex.
                
                // Let's modify Sidebar.tsx to accept an `onLogout` prop instead?
                // No, server action.
                
                // Let's just create a Server Component `LogoutButton` that has its own styles?
                // That's cleanest.
                
                style={{
                    width: '100%',
                    padding: '0.625rem',
                    backgroundColor: 'transparent',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    color: '#dc2626',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    transition: 'all 0.2s ease'
                }}
            >
                Cerrar Sesión
            </button>
        </form>
    );

    return (
        <div className={styles.container}>
            <Sidebar logoutButton={logoutButton} />
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}