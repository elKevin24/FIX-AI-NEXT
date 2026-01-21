import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { Suspense } from 'react';
import TicketSearchFilters from './TicketSearchFilters';
import { Button } from '@/components/ui';
import styles from './tickets.module.css';
import TicketsClient from './TicketsClient';

interface TicketsPageProps {
    searchParams: Promise<{
        search?: string;
        status?: string;
        priority?: string;
        assignedTo?: string;
    }>;
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
    const session = await auth();

    if (!session?.user) {
        return <div>Error: Not authenticated</div>;
    }

    const params = await searchParams;
    const { search, status, priority, assignedTo } = params;

    // Super Admin: adminkev@example.com puede ver TODO
    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    // Construir el where clause dinámicamente
    const where: any = isSuperAdmin ? {} : {
        tenantId: session.user.tenantId,
    };

    // Filtro de búsqueda (ID, título o cliente)
    if (search) {
        where.AND = where.AND || [];
        where.AND.push({
            OR: [
                { id: { contains: search } },
                { title: { contains: search, mode: 'insensitive' } },
                { customer: { name: { contains: search, mode: 'insensitive' } } },
            ],
        });
    }

    // Filtro de estado
    if (status) {
        where.status = status;
    }

    // Filtro de prioridad
    if (priority) {
        where.priority = priority;
    }

    // Filtro de asignado
    if (assignedTo) {
        where.assignedTo = {
            email: { contains: assignedTo, mode: 'insensitive' },
        };
    }

    // Query con filtros
    const tickets = await prisma.ticket.findMany({
        where,
        include: {
            customer: true,
            assignedTo: true,
            tenant: true, // Para mostrar el tenant en la tabla si es super admin
        },
        orderBy: {
            updatedAt: 'desc',
        },
    });

    // Debug info (console only)
    if (isSuperAdmin) {
        console.log('👑 Super Admin accessing all tickets');
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>Tickets</h1>
                    <p>Gestiona las órdenes de servicio y su estado</p>
                </div>
                {isSuperAdmin && (
                    <span className={styles.superAdminBadge}>
                        👑 Super Admin
                    </span>
                )}
                <Button as={Link} href="/dashboard/tickets/create" variant="primary">
                    + Nuevo Ticket
                </Button>
            </div>

            <Suspense fallback={<div>Cargando filtros...</div>}>
                <TicketSearchFilters />
            </Suspense>

            <TicketsClient data={tickets as any} isSuperAdmin={isSuperAdmin} />
        </div>
    );
}