import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import TicketDetailView from './TicketDetailView';
import { getTicketTimeline } from '@/lib/timeline';
import { getTenantPrisma } from '@/lib/tenant-prisma';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: Props) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id || !session?.user?.tenantId) {
        redirect('/login');
    }

    const { tenantId, id: userId, role } = session.user;
    const isSuperAdmin = session.user.email === 'adminkev@example.com';
    const isAdmin = role === 'ADMIN';

    // 1. Get DB Context
    // Use getTenantPrisma to automatically enforce tenant isolation
    const db = getTenantPrisma(tenantId, userId);

    try {
        // 2. Fetch Ticket with STRICT Tenant Isolation
        // CRITICAL SECURITY: Always use getTenantPrisma to enforce tenant filtering
        // Using findFirst with explicit tenantId check eliminates race condition window

        const ticket = await db.ticket.findFirst({
            where: {
                id,
                tenantId, // CRITICAL: Explicit tenant filter
            },
            include: makeTicketInclude(),
        });

        if (!ticket) {
            // Either ticket doesn't exist or doesn't belong to this tenant
            notFound();
        }

        // 3. Fetch Available Resources (Technicians, Parts, Services)
        // These MUST be scoped to tenant.
        
        const availableUsers = await db.user.findMany({
            where: {
                role: {
                    in: ['ADMIN', 'TECHNICIAN'],
                },
                // status: 'AVAILABLE', // We might want to see even unavailable ones to reassign?
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

        const availableParts = await db.part.findMany({
            where: {
                quantity: { gt: 0 },
            },
            orderBy: {
                name: 'asc',
            },
        });

        const availableServices = await db.serviceTemplate.findMany({
            where: {
                isActive: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        // 4. Serialize for Client Component
        const serializedParts = availableParts.map((part: any) => ({
            id: part.id,
            name: part.name,
            sku: part.sku,
            quantity: part.quantity,
            cost: Number(part.cost),
            price: Number(part.price),
            category: part.category,
            location: part.location,
            minStock: part.minStock,
        }));

        const serializedServices = availableServices.map((service: any) => ({
            id: service.id,
            name: service.name,
            laborCost: service.laborCost ? Number(service.laborCost) : 0,
        }));

        const serializedTicketServices = ticket.services?.map((s: any) => ({
            ...s,
            laborCost: s.laborCost ? Number(s.laborCost) : 0,
        })) || [];

        // 5. Get Timeline
        const timelineEvents = await getTicketTimeline(ticket.id, ticket.tenantId);

        return (
            <TicketDetailView
                ticket={{
                    ...ticket,
                    services: serializedTicketServices,
                }}
                availableUsers={availableUsers.map((u: any) => ({...u, role: u.role as string}))} // Simple cast
                availableParts={serializedParts}
                availableServices={serializedServices}
                isSuperAdmin={isSuperAdmin}
                isAdmin={isAdmin}
                currentUserId={userId}
                timelineEvents={timelineEvents}
            />
        );

    } catch (error) {
        console.error('Error fetching ticket details:', error);
        notFound();
    }
}

function makeTicketInclude() {
    return {
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
            } as const,
        },
        partsUsed: {
            include: {
                part: true,
            },
            orderBy: {
                createdAt: 'desc',
            } as const,
        },
        services: {
            orderBy: {
                createdAt: 'desc',
            } as const,
        },
    };
}
