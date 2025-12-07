import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.card}>
                    <div className={styles.iconContainer}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-error-600)" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 8v4m0 4h.01" />
                        </svg>
                    </div>
                    <h1 className={styles.title}>
                        Ticket No Encontrado
                    </h1>
                    <p className={styles.description}>
                        El ticket que estás buscando no existe o ha sido eliminado.
                        Por favor, verifica el ID del ticket e intenta nuevamente.
                    </p>
                    <Link href="/tickets/status" className="btn btn-glass">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Volver a Consultar Ticket
                    </Link>
                </div>
            </div>
        </div>
    );
}

