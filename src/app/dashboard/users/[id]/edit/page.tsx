import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import EditUserForm from './EditUserForm';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: Props) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    if (session.user.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

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
    if (!isSuperAdmin && user.tenantId !== session.user.tenantId) {
        redirect('/dashboard/users');
    }

    return (
        <EditUserForm
            user={user}
            currentUserId={session.user.id}
            isSuperAdmin={isSuperAdmin}
        />
    );
}
