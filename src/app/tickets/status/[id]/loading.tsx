import styles from './loading.module.css';

export default function Loading() {
    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.spinner} />
                <p className={styles.text}>
                    Cargando información del ticket...
                </p>
            </div>
        </div>
    );
}

