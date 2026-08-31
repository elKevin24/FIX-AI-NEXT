import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import styles from '../../tickets/tickets.module.css';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui';
import CreatePartForm from './CreatePartForm';

export const metadata = {
    title: 'Nuevo Repuesto',
    description: 'Registra una nueva pieza o repuesto en el inventario del taller.',
    openGraph: {
        title: 'Nuevo Repuesto | FIX Workshop',
        description: 'Registra una nueva pieza o repuesto en el inventario del taller.',
    },
};

export default async function CreatePartPage() {
    const session = await auth();

    if (!session?.user?.tenantId) {
        redirect('/login');
    }

    return (
        <div className={styles['container']}>
            <PageHeader
                title="Nuevo Repuesto"
                subtitle="Registra una nueva pieza o repuesto en el inventario del taller"
                actions={
                    <Button as={Link} href="/dashboard/parts" variant="secondary" size="sm" leftIcon={<span>←</span>}>
                        Volver a Repuestos
                    </Button>
                }
            />

            <div className={styles['tableContainer']} style={{ maxWidth: '600px', padding: '2rem' }}>
                <CreatePartForm />
            </div>
        </div>
    );
}

