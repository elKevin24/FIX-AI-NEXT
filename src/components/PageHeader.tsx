import { ShieldCheck } from 'lucide-react';
import styles from './PageHeader.module.css';
import GlobalSearch from './GlobalSearch';

interface PageHeaderProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
    search?: boolean;
    superAdmin?: boolean;
}

export default function PageHeader({
    title,
    subtitle,
    actions,
    search,
    superAdmin,
}: PageHeaderProps) {
    return (
        <header className={styles['header']}>
            <div className={styles['headerContent']}>
                <h1>{title}</h1>
                {subtitle && <div className={styles['subtitle']}>{subtitle}</div>}
            </div>
            {actions && <div className={styles['actions']}>{actions}</div>}
            {search && (
                <div className={styles['searchBar']}>
                    <GlobalSearch />
                </div>
            )}
            {superAdmin && (
                <span className={styles['superAdminBadge']}>
                    <ShieldCheck size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} aria-hidden="true" />
                    Super Admin
                </span>
            )}
        </header>
    );
}