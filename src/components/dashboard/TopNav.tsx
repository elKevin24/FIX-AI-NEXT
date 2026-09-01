'use client';

import { useSidebar } from '@/contexts/SidebarContext';
import NotificationBell from './NotificationBell';
import styles from './TopNav.module.css';

export default function TopNav() {
    const { toggle, isOpen } = useSidebar();

    return (
        <header className={styles['topNav']}>
            <div className={styles['leftSection']}>
                <button
                    className={styles['menuButton']}
                    onClick={toggle}
                    aria-label={isOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
                    aria-expanded={isOpen}
                    type="button"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {isOpen ? (
                            <>
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </>
                        ) : (
                            <>
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <line x1="3" y1="18" x2="21" y2="18" />
                            </>
                        )}
                    </svg>
                </button>
                <div className={styles['mobileBrand']}>
                    <span className={styles['brandIcon']} aria-hidden="true" />
                    <span className={styles['brandText']}>FIX-AI</span>
                </div>
            </div>
            <div className={styles['rightSection']}>
                <NotificationBell />
            </div>
        </header>
    );
}