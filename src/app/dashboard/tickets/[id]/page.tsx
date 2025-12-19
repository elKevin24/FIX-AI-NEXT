import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import TicketDetailView from './TicketDetailView';
import { getTicketTimeline } from '@/lib/timeline';


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
            services: {
                orderBy: {
                    createdAt: 'desc',
                },
            }, // @ts-ignore
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

    // Get available services from the same tenant
    const availableServices = await prisma.serviceTemplate.findMany({
        where: {
            tenantId: ticket.tenantId,
            isActive: true,
        },
        orderBy: {
            name: 'asc',
        },
    });

    // Convert Decimal objects to numbers for client components
    const serializedParts = availableParts.map((part: any) => ({
        ...part,
        cost: part.cost ? Number(part.cost) : 0,
        price: part.price ? Number(part.price) : 0,
    }));

    const serializedServices = availableServices.map(service => ({
        id: service.id,
        name: service.name,
        laborCost: service.laborCost ? Number(service.laborCost) : 0,
    }));

    // @ts-ignore
    const serializedTicketServices = (ticket as any).services?.map((s: any) => ({
        ...s,
        laborCost: s.laborCost ? Number(s.laborCost) : 0,
    })) || [];

    // Get combined timeline events (notes + audit logs)
    const timelineEvents = await getTicketTimeline(ticket.id, ticket.tenantId);

    return (
        <TicketDetailView
            ticket={{
                ...(ticket as any),
                services: serializedTicketServices,
            }}
            availableUsers={availableUsers}
            availableParts={serializedParts}
            availableServices={serializedServices}
            isSuperAdmin={isSuperAdmin}
            isAdmin={isAdmin}
            currentUserId={session.user.id}
            timelineEvents={timelineEvents}
        />
    );
}
