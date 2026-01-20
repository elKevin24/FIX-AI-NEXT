'use client';

import NotificationBell from './NotificationBell';
import styles from './TopNav.module.css';

export default function TopNav() {
    return (
        <header className={styles.topNav}>
            <div className={styles.leftSection}>
                <NotificationBell />
            </div>
            <div className={styles.rightSection}>
                {/* Future: User Profile Dropdown, Breadcrumbs, etc. */}
            </div>
        </header>
    );
}
