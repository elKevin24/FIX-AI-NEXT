import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { isSuperAdmin } from '@/lib/authz';
import { isAdmin as checkIsAdmin } from '@/lib/auth-utils';
import { redirect, notFound } from 'next/navigation';
import PartEditForm from './PartEditForm';

export const metadata = {
    title: 'Editar Repuesto',
    description: 'Modifica los datos, precios y stock de un repuesto del inventario.',
};

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EditPartPage({ params }: Props) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const isSuperAdminUser = isSuperAdmin(session.user);

    const part = await prisma.part.findUnique({
        where: { id },
        include: {
            tenant: {
                select: {
                    id: true,
                    name: true,
                },
            },
            usages: {
                select: {
                    id: true,
                },
            },
        },
    });

    if (!part) {
        notFound();
    }

    // Check tenant isolation (unless super admin)
    if (!isSuperAdminUser && part.tenantId !== session.user.tenantId) {
        redirect('/dashboard/parts');
    }

    const isAdmin = checkIsAdmin(session.user.role);

    return (
        <PartEditForm
            part={part}
            isAdmin={isAdmin}
            hasUsageRecords={part.usages.length > 0}
        />
    );
}
