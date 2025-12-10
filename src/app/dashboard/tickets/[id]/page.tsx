import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import TicketDetailView from './TicketDetailView';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: Props) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';
    const isAdmin = session.user.role === 'ADMIN';

    const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
            customer: true,
            assignedTo: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            tenant: {
                select: {
                    id: true,
                    name: true,
                },
            },
            notes: {
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            },
            partsUsed: {
                include: {
                    part: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            },
        },
    });

    if (!ticket) {
        notFound();
    }

    // Check tenant isolation (unless super admin)
    if (!isSuperAdmin && ticket.tenantId !== session.user.tenantId) {
        redirect('/dashboard/tickets');
    }

    // Get users that can be assigned (technicians and admins from the same tenant)
    const availableUsers = await prisma.user.findMany({
        where: {
            tenantId: ticket.tenantId,
            role: {
                in: ['ADMIN', 'TECHNICIAN'],
            },
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
        },
        orderBy: {
            name: 'asc',
        },
    });

    // Get available parts from the same tenant
    const availableParts = await prisma.part.findMany({
        where: {
            tenantId: ticket.tenantId,
            quantity: {
                gt: 0, // Only parts with stock
            },
        },
        orderBy: {
            name: 'asc',
        },
    });

    return (
        <TicketDetailView
            ticket={ticket}
            availableUsers={availableUsers}
            availableParts={availableParts}
            isSuperAdmin={isSuperAdmin}
            isAdmin={isAdmin}
            currentUserId={session.user.id}
        />
    );
}
