import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { auth } from '@/auth';
import { Suspense } from 'react';
import { Prisma } from '@prisma/client';
import { isSuperAdmin } from '@/lib/authz';
import TicketSearchFilters from './TicketSearchFilters';
import { Button } from '@/components/ui';
import ExportButton from '@/components/ui/ExportButton';
import PageHeader from '@/components/PageHeader';
import styles from './tickets.module.css';
import TicketsClient from './TicketsClient';

import PaginationControls from '@/components/ui/PaginationControls';

interface TicketsPageProps {
    searchParams: Promise<{
        search?: string;
        status?: string;
        priority?: string;
        assignedTo?: string;
        dateFrom?: string;
        dateTo?: string;
        deviceType?: string;
        page?: string;
    }>;
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
    const session = await auth();

    if (!session?.user) {
        return <div>Error: Not authenticated</div>;
    }

    const params = await searchParams;
    const { search, status, priority, assignedTo, dateFrom, dateTo, deviceType, page } = params;
    const startDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : undefined;
    const endDate = dateTo ? new Date(`${dateTo}T23:59:59.999`) : undefined;
    
    // Configuración de Paginación
    const currentPage = Number(page) || 1;
    const pageSize = 20;
    const offset = (currentPage - 1) * pageSize;

    // Super Admin: evaluación centralizada y segura
    const isSuperAdminUser = isSuperAdmin(session.user);
    const tenantId = session.user.tenantId;

    // Construir el where clause base para filtros estándar
    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedTo = { email: { contains: assignedTo, mode: 'insensitive' } };
    if (deviceType) where.deviceType = deviceType;
    if (startDate || endDate) where.createdAt = { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) };

    let tickets;
    let totalItems = 0;

    if (search && search.trim().length >= 2) {
        // BÚSQUEDA INTELIGENTE (Fuzzy Search con Trigramas)
        const db = isSuperAdminUser ? prisma : getTenantPrisma(tenantId!);
        
        // 1. Obtener conteo total para paginación
        // Nota: Es una estimación rápida o conteo exacto de la query filtrada
        const countResult = await db.$queryRaw<any[]>`
            SELECT COUNT(*)::int as total
            FROM tickets t
            LEFT JOIN customers c ON t."customerId" = c.id
            LEFT JOIN users u ON t."assignedToId" = u.id
            WHERE 1=1
              ${isSuperAdminUser ? Prisma.empty : Prisma.sql`AND t."tenantId" = ${tenantId}`}
              ${status ? Prisma.sql`AND t.status = ${status}::"TicketStatus"` : Prisma.empty}
              ${priority ? Prisma.sql`AND t.priority = ${priority}::"TicketPriority"` : Prisma.empty}
              ${assignedTo ? Prisma.sql`AND (u.name ILIKE ${'%' + assignedTo + '%'} OR u.email ILIKE ${'%' + assignedTo + '%'})` : Prisma.empty}
              ${deviceType ? Prisma.sql`AND t."deviceType" = ${deviceType}` : Prisma.empty}
              ${startDate ? Prisma.sql`AND t."createdAt" >= ${startDate}` : Prisma.empty}
              ${endDate ? Prisma.sql`AND t."createdAt" <= ${endDate}` : Prisma.empty}
              AND (
                t.title % ${search} OR 
                t."ticket_key" % ${search} OR 
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
              ${isSuperAdminUser ? Prisma.empty : Prisma.sql`AND t."tenantId" = ${tenantId}`}
              ${status ? Prisma.sql`AND t.status = ${status}::"TicketStatus"` : Prisma.empty}
              ${priority ? Prisma.sql`AND t.priority = ${priority}::"TicketPriority"` : Prisma.empty}
              ${assignedTo ? Prisma.sql`AND (u.name ILIKE ${'%' + assignedTo + '%'} OR u.email ILIKE ${'%' + assignedTo + '%'})` : Prisma.empty}
              ${deviceType ? Prisma.sql`AND t."deviceType" = ${deviceType}` : Prisma.empty}
              ${startDate ? Prisma.sql`AND t."createdAt" >= ${startDate}` : Prisma.empty}
              ${endDate ? Prisma.sql`AND t."createdAt" <= ${endDate}` : Prisma.empty}
              AND (
                t.title % ${search} OR 
                t."ticket_key" % ${search} OR 
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
        if (isSuperAdminUser) {
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
        <div className={styles['container']}>
            <PageHeader
                title="Tickets"
                subtitle="Gestiona las órdenes de servicio y su estado"
                superAdmin={isSuperAdminUser}
                actions={
                    <>
                        <ExportButton type="tickets" />
                        <Button as={Link} href="/dashboard/tickets/create" variant="primary">
                            + Nuevo Ticket
                        </Button>
                    </>
                }
            />

            <Suspense fallback={<div>Cargando filtros...</div>}>
                <TicketSearchFilters />
            </Suspense>

            <TicketsClient data={tickets as any} isSuperAdmin={isSuperAdminUser} />

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
