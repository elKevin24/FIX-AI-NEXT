import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';
import { Button, Card, CardTitle, CardDescription, CardBody, BrandLogo, ThemeSwitcher, Badge } from '@/components/ui';

export const metadata: Metadata = {
    title: 'FIX Workshop | Sistema de Gestión Multi-Tenant para Talleres',
    description: 'Gestiona múltiples talleres bajo un solo sistema escalable. Control total de tickets, usuarios, inventario y clientes con aislamiento por tenant.',
    openGraph: {
        title: 'FIX Workshop | Sistema de Gestión Multi-Tenant',
        description: 'Plataforma integral para talleres de electrónica y servicio técnico.',
    },
};

const features = [
    {
        icon: '🏢',
        title: 'Multi-Tenancy',
        description: 'Gestiona múltiples talleres independientes con aislamiento completo de datos por tenant.',
    },
    {
        icon: '🎫',
        title: 'Gestión de Tickets',
        description: 'Sistema completo de tickets con estados, asignaciones y seguimiento en tiempo real.',
    },
    {
        icon: '👥',
        title: 'Control de Acceso',
        description: 'Roles y permisos granulares: Admin, Técnico y Recepcionista.',
    },
    {
        icon: '📊',
        title: 'Auditoría',
        description: 'Registro completo de todas las acciones para trazabilidad y cumplimiento.',
    },
    {
        icon: '⚡',
        title: 'Serverless',
        description: 'Escalabilidad automática con Next.js 16 y despliegue optimizado en Vercel.',
    },
    {
        icon: '🔒',
        title: 'Seguridad',
        description: 'Autenticación segura y validación estricta por tenant en cada operación.',
    },
];

export default function Home() {
    return (
        <div className={styles['page']}>
            <header className={styles['nav']}>
                <Link href="/" className={styles['brandLink']} aria-label="FIX Workshop - Inicio">
                    <BrandLogo size="md" theme="dark" />
                </Link>
                <div className={styles['navActions']}>
                    <ThemeSwitcher />
                    <Button as={Link} href="/login" variant="primary" size="sm">
                        Iniciar sesión
                    </Button>
                </div>
            </header>

            <main id="main-content" className={styles['main']}>
                <section className={styles['hero']}>
                    <div className={styles['heroContent']}>
                        <Badge variant="info" className={styles['heroBadge']}>
                            Multi-Tenant SaaS
                        </Badge>
                        <h1 className={styles['title']}>
                            FIX Workshop
                            <span className={styles['titleAccent']}> Management System</span>
                        </h1>
                        <p className={styles['subtitle']}>
                            Gestiona múltiples talleres eléctricos bajo un solo sistema escalable.
                            Control total de tickets, usuarios, inventario y clientes con aislamiento de datos por tenant.
                        </p>
                        <div className={styles['ctaGroup']}>
                            <Button as={Link} href="/login" variant="primary" size="lg">
                                Acceder al Sistema
                            </Button>
                            <Button as={Link} href="/tickets/status" variant="secondary" size="lg">
                                Consultar Ticket
                            </Button>
                        </div>
                    </div>
                </section>

                <section className={styles['features']} aria-labelledby="features-title">
                    <h2 id="features-title" className={styles['sectionTitle']}>
                        Características Principales
                    </h2>
                    <div className={styles['featureGrid']}>
                        {features.map((feature) => (
                            <Card key={feature.title} className={styles['featureCard']}>
                                <CardBody className={styles['featureBody']}>
                                    <div className={styles['featureIcon']} aria-hidden="true">
                                        {feature.icon}
                                    </div>
                                    <CardTitle>{feature.title}</CardTitle>
                                    <CardDescription>{feature.description}</CardDescription>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                </section>
            </main>

            <footer className={styles['footer']}>
                <BrandLogo size="sm" theme="dark" />
                <p className={styles['footerText']}>
                    © {new Date().getFullYear()} FIX Workshop. Sistema de gestión multi-tenant para talleres eléctricos.
                </p>
            </footer>
        </div>
    );
}
