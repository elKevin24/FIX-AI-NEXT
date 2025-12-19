import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import TicketDetailView from './TicketDetailView';
import { getTicketTimeline } from '@/lib/timeline';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { prisma } from '@/lib/prisma'; // Keep for strictly super admin specific fallback if needed, but try to minimize

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
        // 2. Fetch Ticket
        // Note: findUnique in extension might not enforce filtering if ID is provided directly depending on implementation,
        // but our implementation usually does. However, for findUnique, Prisma extension 'where' hooks often don't fire.
        // So we explicitly check tenantId or use findFirst with tenantId filter if strictness is needed.
        // But let's stick to standard findUnique and verify later if needed, or better:
        // Use findUnique and let middleware/logic handle, but to be 100% safe against leaks:
        
        let ticket: any;
        
        if (isSuperAdmin) {
             // Super Admin might view across tenants, so we use global prisma + check
             // But here we might just want to see it contextually?
             // If we are "logged in" as a user of a tenant, we should see that tenant's view.
             // If Super Admin has no tenantId? They shouldn't be here really without selecting one.
             // Assuming Super Admin "masquerades" or just uses their assigned tenant.
             ticket = await prisma.ticket.findUnique({
                where: { id },
                include: makeTicketInclude(),
             });
        } else {
             // Standard User
             ticket = await db.ticket.findUnique({
                 where: { id },
                 include: makeTicketInclude(),
             });
        }

        if (!ticket) {
            notFound();
        }

        // Strict Tenant Check (Double Safety)
        if (!isSuperAdmin && ticket.tenantId !== tenantId) {
            // Ideally wouldn't find it, but if ID lookup bypassed filter:
            redirect('/dashboard/tickets');
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
