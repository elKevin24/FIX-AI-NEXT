import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { Button } from '@/components/ui';
import Link from 'next/link';
import UsersClient from './UsersClient';
import PageHeader from '@/components/PageHeader';
import styles from './users.module.css';
import { hasPermission } from '@/lib/auth-utils';
import type { UserRole } from '@prisma/client';

export default async function UsersPage() {
    const session = await auth();

    if (!session?.user?.tenantId) {
        redirect('/login');
    }

    // Check if user can manage users
    const canManage = hasPermission(session.user.role as UserRole, 'canCreateUsers') ||
                      hasPermission(session.user.role as UserRole, 'canEditUsers');

    if (!canManage) {
        return (
            <div className={styles['container']}>
                <div className="text-center py-12">
                    <h2 className="text-xl font-semibold text-gray-800">Acceso denegado</h2>
                    <p className="text-gray-600 mt-2">No tienes permisos para gestionar usuarios.</p>
                </div>
            </div>
        );
    }

    const db = getTenantPrisma(session.user.tenantId);

    const users = await db.user.findMany({
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            passwordMustChange: true,
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
        orderBy: [
            { isActive: 'desc' }, // Active users first
            { createdAt: 'desc' },
        ],
    });

    const canCreate = hasPermission(session.user.role as UserRole, 'canCreateUsers');

    return (
        <div className={styles['container']}>
            <PageHeader
                title="Usuarios"
                subtitle="Gestiona el equipo del tenant"
                actions={
                    canCreate && (
                        <Button as={Link} href="/dashboard/users/create" variant="primary">
                            + Nuevo Usuario
                        </Button>
                    )
                }
            />

            <UsersClient
                data={users}
                currentUserId={session.user.id}
                currentUserRole={session.user.role as UserRole}
            />
        </div>
    );
}
