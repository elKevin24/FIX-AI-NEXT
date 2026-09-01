'use client';

import { Button } from '@/components/ui';
import styles from './offline.module.css';

export default function OfflinePage() {
    return (
        <main className={styles['container']}>
            <div className={styles['card']}>
                <div aria-hidden="true" className={styles['iconWrapper']}>
                    <svg
                        className={styles['icon']}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13a9 9 0 0118 0M5 13a6 6 0 0114 0M8 13a3 3 0 014 0H8z"
                        />
                    </svg>
                </div>
                <h1 className={styles['title']}>
                    Sin conexión
                </h1>
                <p className={styles['description']}>
                    No tienes acceso a internet en este momento. Vuelve a conectar para
                    seguir usando FIX Workshop.
                </p>
                <div className={styles['actionWrapper']}>
                    <Button
                        variant="primary"
                        onClick={() => window.location.reload()}
                    >
                        Reintentar
                    </Button>
                </div>
            </div>
        </main>
    );
}
