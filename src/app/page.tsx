import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
    return (
        <main className={styles.container}>
            <div className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1 className={styles.title}>
                        Multi-Tenant Workshop
                        <span className={styles.gradient}> Management System</span>
                    </h1>
                    <p className={styles.subtitle}>
                        Gestiona múltiples talleres electrónicos bajo un solo sistema escalable.
                        Control total de tickets, usuarios, inventario y clientes con aislamiento de datos por tenant.
                    </p>
                    <div className={styles.ctaGroup}>
                        <Link href="/login" className={styles.primaryBtn}>
                            Acceder al Sistema
                        </Link>
                        <Link href="/tickets/status" className={styles.secondaryBtn}>
                            Consultar Ticket
                        </Link>
                    </div>
                </div>
            </div>

            <section className={styles.features}>
                <h2 className={styles.sectionTitle}>Características Principales</h2>
                <div className={styles.featureGrid}>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>🏢</div>
                        <h3>Multi-Tenancy</h3>
                        <p>Gestiona múltiples talleres independientes con aislamiento completo de datos</p>
                    </div>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>🎫</div>
                        <h3>Gestión de Tickets</h3>
                        <p>Sistema completo de tickets con estados, asignaciones y seguimiento en tiempo real</p>
                    </div>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>👥</div>
                        <h3>Control de Acceso</h3>
                        <p>Roles y permisos granulares: Admin, Técnico, Recepcionista</p>
                    </div>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>📊</div>
                        <h3>Auditoría</h3>
                        <p>Registro completo de todas las acciones para trazabilidad y cumplimiento</p>
                    </div>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>⚡</div>
                        <h3>Serverless</h3>
                        <p>Escalabilidad automática con Next.js 15 y despliegue en Vercel</p>
                    </div>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>🔒</div>
                        <h3>Seguridad</h3>
                        <p>Autenticación JWT con NextAuth.js y validación por tenant</p>
                    </div>
                </div>
            </section>
        </main>
    );
}
