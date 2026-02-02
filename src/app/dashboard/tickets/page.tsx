import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { auth } from '@/auth';
import { Suspense } from 'react';
import { Prisma } from '@prisma/client';
import TicketSearchFilters from './TicketSearchFilters';
import { Button } from '@/components/ui';
import styles from './tickets.module.css';
import TicketsClient from './TicketsClient';

import PaginationControls from '@/components/ui/PaginationControls';

interface TicketsPageProps {
    searchParams: Promise<{
        search?: string;
        status?: string;
        priority?: string;
        assignedTo?: string;
        page?: string;
    }>;
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
    const session = await auth();

    if (!session?.user) {
        return <div>Error: Not authenticated</div>;
    }

    const params = await searchParams;
    const { search, status, priority, assignedTo, page } = params;
    
    // Configuración de Paginación
    const currentPage = Number(page) || 1;
    const pageSize = 20;
    const offset = (currentPage - 1) * pageSize;

    // Super Admin: adminkev@example.com puede ver TODO
    const isSuperAdmin = session.user.email === 'adminkev@example.com';
    const tenantId = session.user.tenantId;

    // Construir el where clause base para filtros estándar
    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedTo = { email: { contains: assignedTo, mode: 'insensitive' } };

    let tickets;
    let totalItems = 0;

    if (search && search.trim().length >= 2) {
        // BÚSQUEDA INTELIGENTE (Fuzzy Search con Trigramas)
        const db = isSuperAdmin ? prisma : getTenantPrisma(tenantId!);
        
        // 1. Obtener conteo total para paginación
        // Nota: Es una estimación rápida o conteo exacto de la query filtrada
        const countResult = await db.$queryRaw<any[]>`
            SELECT COUNT(*)::int as total
            FROM tickets t
            LEFT JOIN customers c ON t."customerId" = c.id
            WHERE 1=1
              ${isSuperAdmin ? Prisma.empty : Prisma.sql`AND t."tenantId" = ${tenantId}`}
              ${status ? Prisma.sql`AND t.status = ${status}::"TicketStatus"` : Prisma.empty}
              ${priority ? Prisma.sql`AND t.priority = ${priority}::"TicketPriority"` : Prisma.empty}
              AND (
                t.title % ${search} OR 
                t."ticketNumber" % ${search} OR 
                c.name % ${search} OR
                t.description % ${search} OR
                t."serialNumber" ILIKE ${'%' + search + '%'}
              )
        `;
        totalItems = countResult[0]?.total || 0;

        // 2. Obtener datos paginados
        tickets = await db.$queryRaw<any[]>`
            SELECT t.*, 
                   c.name as "customerName", 
                   u.name as "assignedToName",
                   u.email as "assignedToEmail"
            FROM tickets t
            LEFT JOIN customers c ON t."customerId" = c.id
            LEFT JOIN users u ON t."assignedToId" = u.id
            WHERE 1=1
              ${isSuperAdmin ? Prisma.empty : Prisma.sql`AND t."tenantId" = ${tenantId}`}
              ${status ? Prisma.sql`AND t.status = ${status}::"TicketStatus"` : Prisma.empty}
              ${priority ? Prisma.sql`AND t.priority = ${priority}::"TicketPriority"` : Prisma.empty}
              AND (
                t.title % ${search} OR 
                t."ticketNumber" % ${search} OR 
                c.name % ${search} OR
                t.description % ${search} OR
                t."serialNumber" ILIKE ${'%' + search + '%'}
              )
            ORDER BY similarity(t.title, ${search}) DESC
            LIMIT ${pageSize} OFFSET ${offset};
        `;

        // Normalizar formato
        tickets = tickets.map((t: any) => ({
            ...t,
            customer: { name: t.customerName },
            assignedTo: t.assignedToId ? { name: t.assignedToName, email: t.assignedToEmail } : null
        }));

    } else {
        // BÚSQUEDA ESTÁNDAR
        // 1. Conteo
        // Si no es superadmin, getTenantPrisma ya filtra, pero findMany necesita where explicito si usamos el cliente raw, 
        // pero aquí usamos la abstracción
        if (isSuperAdmin) {
             totalItems = await prisma.ticket.count({ where });
             tickets = await prisma.ticket.findMany({
                where,
                include: { customer: true, assignedTo: true, tenant: true },
                orderBy: { updatedAt: 'desc' },
                take: pageSize,
                skip: offset,
            });
        } else {
             const tenantPrisma = getTenantPrisma(tenantId!);
             totalItems = await tenantPrisma.ticket.count({ where });
             tickets = await tenantPrisma.ticket.findMany({
                where,
                include: { customer: true, assignedTo: true, tenant: true },
                orderBy: { updatedAt: 'desc' },
                take: pageSize,
                skip: offset,
            });
        }
    }

    const totalPages = Math.ceil(totalItems / pageSize);

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
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button as="a" href="/api/export/tickets" variant="secondary">
                        📥 Exportar CSV
                    </Button>
                    <Button as={Link} href="/dashboard/tickets/create" variant="primary">
                        + Nuevo Ticket
                    </Button>
                </div>
            </div>

            <Suspense fallback={<div>Cargando filtros...</div>}>
                <TicketSearchFilters />
            </Suspense>

            <TicketsClient data={tickets as any} isSuperAdmin={isSuperAdmin} />

            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                hasNextPage={currentPage < totalPages}
                hasPrevPage={currentPage > 1}
                totalItems={totalItems}
            />
        </div>
    );
}