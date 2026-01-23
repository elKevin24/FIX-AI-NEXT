import { prisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import EditCustomerForm from './EditCustomerForm';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EditCustomerPage({ params }: Props) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id || !session?.user?.tenantId) {
        redirect('/login');
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';
    const isAdmin = session.user.role === 'ADMIN';
    const tenantId = session.user.tenantId;

    let customer;

    if (isSuperAdmin) {
        customer = await prisma.customer.findUnique({
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
    } else {
        const tenantPrisma = getTenantPrisma(tenantId);
        customer = await tenantPrisma.customer.findUnique({
            where: { id }, // Wrapper auto-injects { tenantId } check
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
    }

    if (!customer) {
        notFound();
    }

    // No need for manual tenant check as the query filtered it (or allowed it for SuperAdmin)

    return (
        <EditCustomerForm
            customer={customer}
            isSuperAdmin={isSuperAdmin}
            isAdmin={isAdmin}
        />
    );
}
