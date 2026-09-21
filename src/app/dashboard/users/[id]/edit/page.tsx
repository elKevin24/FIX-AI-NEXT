import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { isSuperAdmin } from '@/lib/authz';
import { isAdmin, hasPermission } from '@/lib/auth-utils';
import { redirect, notFound } from 'next/navigation';
import EditUserForm from './EditUserForm';
import type { UserRole } from '@prisma/client';

export const metadata = {
    title: 'Editar Usuario',
    description: 'Modifica los datos, rol y estado de un miembro del equipo.',
};

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: Props) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    if (!isAdmin(session.user.role as any) && !hasPermission(session.user.role as UserRole, 'canEditUsers')) {
        redirect('/dashboard');
    }

    const isSuperAdminUser = isSuperAdmin(session.user);

    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            tenantId: true,
            tenant: {
                select: {
                    name: true,
                },
            },
        },
    });

    if (!user) {
        notFound();
    }

    // Check tenant isolation (unless super admin)
    if (!isSuperAdminUser && user.tenantId !== session.user.tenantId) {
        redirect('/dashboard/users');
    }

    return (
        <EditUserForm
            user={user}
            currentUserId={session.user.id}
            isSuperAdmin={isSuperAdminUser}
        />
    );
}
