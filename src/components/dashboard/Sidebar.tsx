'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

interface SidebarProps {
    logoutButton: React.ReactNode;
}

export default function Sidebar({ logoutButton }: SidebarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    // Close sidebar when route changes (mobile)
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsOpen(false);
    }, [pathname]);

    // Prevent scrolling when sidebar is open on mobile
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <>
            {/* Mobile Toggle Button */}
            <button 
                className={styles.mobileToggle}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle Menu"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>

            {/* Overlay */}
            <div 
                className={`${styles.overlay} ${isOpen ? styles.open : ''}`}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
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
                    {logoutButton}
                </div>
            </aside>
        </>
    );
}
