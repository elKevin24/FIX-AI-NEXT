import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { Button } from '@/components/ui';
import Link from 'next/link';
import UsersClient from './UsersClient';
import styles from './users.module.css';

export default async function UsersPage() {
    const session = await auth();

    if (!session?.user?.tenantId) {
        redirect('/login');
    }

    if (session.user.role !== 'ADMIN') {
        return <div className={styles.container}>Acceso denegado. Solo administradores.</div>;
    }

    const db = getTenantPrisma(session.user.tenantId);

    const users = await db.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            _count: {
                select: {
                    assignedTickets: {
                        where: {
                            status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] }
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>Usuarios</h1>
                    <p>Gestiona el equipo técnico y administrativo</p>
                </div>
                <Button as={Link} href="/dashboard/users/create" variant="primary">
                    + Nuevo Usuario
                </Button>
            </div>

            <UsersClient data={users} />
        </div>
    );
}
