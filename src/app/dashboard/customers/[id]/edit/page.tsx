import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import EditCustomerForm from './EditCustomerForm';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EditCustomerPage({ params }: Props) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';
    const isAdmin = session.user.role === 'ADMIN';

    const customer = await prisma.customer.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            dpi: true,
            nit: true,
            tenantId: true,
            tenant: {
                select: {
                    name: true,
                },
            },
            _count: {
                select: {
                    tickets: true,
                },
            },
        },
    });

    if (!customer) {
        notFound();
    }

    // Check tenant isolation (unless super admin)
    if (!isSuperAdmin && customer.tenantId !== session.user.tenantId) {
        redirect('/dashboard/customers');
    }

    return (
        <EditCustomerForm
            customer={customer}
            isSuperAdmin={isSuperAdmin}
            isAdmin={isAdmin}
        />
    );
}
