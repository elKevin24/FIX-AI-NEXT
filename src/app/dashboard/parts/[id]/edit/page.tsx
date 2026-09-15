import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import PartEditForm from './PartEditForm';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EditPartPage({ params }: Props) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

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
    if (!isSuperAdmin && part.tenantId !== session.user.tenantId) {
        redirect('/dashboard/parts');
    }

    const isAdmin = session.user.role === 'ADMIN';

    return (
        <PartEditForm
            part={part}
            isAdmin={isAdmin}
            hasUsageRecords={part.usages.length > 0}
        />
    );
}
