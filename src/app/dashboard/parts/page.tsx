import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { Button } from '@/components/ui';
import Link from 'next/link';
import ExportButton from '@/components/ui/ExportButton';
import styles from './parts.module.css';
import PartsClient from './PartsClient';
import { Prisma } from '@prisma/client';
import PartSearchFilters from './PartSearchFilters';

import PaginationControls from '@/components/ui/PaginationControls';

interface PartsPageProps {
    searchParams: Promise<{
        search?: string;
        page?: string;
    }>;
}

export default async function PartsPage({ searchParams }: PartsPageProps) {
    const session = await auth();

    if (!session?.user?.tenantId) {
        redirect('/login');
    }

    const params = await searchParams;
    const { search, page } = params;
    const tenantId = session.user.tenantId;
    const db = getTenantPrisma(tenantId, session.user.id);

    // Configuración Paginación
    const currentPage = Number(page) || 1;
    const pageSize = 20;
    const offset = (currentPage - 1) * pageSize;

    let parts;
    let totalItems = 0;

    if (search && search.trim().length >= 2) {
        // 1. Conteo Búsqueda Difusa
        const countResult = await db.$queryRaw<any[]>`
            SELECT COUNT(*)::int as total
            FROM parts
            WHERE "tenantId" = ${tenantId}
              AND (
                name % ${search} OR 
                sku % ${search} OR
                category ILIKE ${'%' + search + '%'} 
              )
        `;
        totalItems = countResult[0]?.total || 0;

        // 2. Datos Paginados
        parts = await db.$queryRaw<any[]>`
            SELECT *
            FROM parts
            WHERE "tenantId" = ${tenantId}
              AND (
                name % ${search} OR 
                sku % ${search} OR
                category ILIKE ${'%' + search + '%'} 
              )
            ORDER BY similarity(name, ${search}) DESC
            LIMIT ${pageSize} OFFSET ${offset};
        `;
    } else {
        // 1. Conteo Total
        totalItems = await db.part.count();

        // 2. Lista Paginada
        parts = await db.part.findMany({
            orderBy: {
                updatedAt: 'desc',
            },
            take: pageSize,
            skip: offset,
        });
    }

    // Calcular estadísticas (SIEMPRE sobre el total global, no paginado)
    // Nota: Mantenemos la lógica de estadísticas sobre todo el inventario para que los widgets sean útiles
    // Para optimizar, podríamos cachear esto o hacerlo en una query separada ligera.
    const allPartsCount = await db.part.count(); 
    // Si queremos el valor total del inventario, necesitamos sumar todo. 
    // Para no traer todos los registros a memoria, usamos aggregate.
    const aggregate = await db.part.aggregate({
        _count: {
            _all: true
        },
        _sum: {
            // Prisma Decimal summation returns Decimal
            // We can't multiply in _sum directly in Prisma standard.
            // We have to iterate or use queryRaw for weighted sum.
        }
    });
    
    // Fallback optimizado para stock bajo y valor total usando queryRaw para velocidad
    const stats = await db.$queryRaw<any[]>`
        SELECT 
            COUNT(*) FILTER (WHERE quantity <= "minStock")::int as "lowStockCount",
            SUM(cost * quantity)::numeric as "totalValue"
        FROM parts
        WHERE "tenantId" = ${tenantId}
    `;
    
    const lowStockCount = stats[0]?.lowStockCount || 0;
    const totalValue = Number(stats[0]?.totalValue || 0);

    // Convert Decimal to number for client component
    const serializedParts = parts.map((part: any) => ({
        ...part,
        cost: Number(part.cost),
        price: Number(part.price),
    }));

    const totalPages = Math.ceil(totalItems / pageSize);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>Inventario</h1>
                    <p>Gestiona repuestos y control de stock</p>
                    {lowStockCount > 0 && (
                        <p className={styles.lowStockWarning}>
                            ⚠️ Hay {lowStockCount} producto(s) con stock bajo
                        </p>
                    )}
                </div>
                <div className="flex gap-2 items-center">
                    <ExportButton type="parts" />
                    <Button as={Link} href="/dashboard/parts/create" variant="primary">
                        + Nuevo Repuesto
                    </Button>
                </div>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Items</span>
                    <p className={styles.statValue}>{allPartsCount}</p>
                </div>
                <div className={`${styles.statCard} ${lowStockCount > 0 ? styles.lowStock : ''}`}>
                    <span className={styles.statLabel}>Stock Bajo</span>
                    <p className={styles.statValue}>{lowStockCount}</p>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Valor Inventario (Costo)</span>
                    <p className={styles.statValue}>Q{totalValue.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            <PartSearchFilters />

            <PartsClient data={serializedParts} />

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
