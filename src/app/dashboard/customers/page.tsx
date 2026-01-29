import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { Button } from '@/components/ui';
import Link from 'next/link';
import styles from './customers.module.css';
import CustomersClient from './CustomersClient';
import { Prisma } from '@prisma/client';
import CustomerSearchFilters from './CustomerSearchFilters';

import PaginationControls from '@/components/ui/PaginationControls';

interface CustomersPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
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

  let customers;
  let totalItems = 0;

  if (search && search.trim().length >= 2) {
    // 1. Conteo Búsqueda Difusa
    const countResult = await db.$queryRaw<any[]>`
      SELECT COUNT(*)::int as total
      FROM customers c
      WHERE c."tenantId" = ${tenantId}
        AND (
          c.name % ${search} OR 
          c.email % ${search} OR 
          c.phone % ${search} OR
          c.nit ILIKE ${'%' + search + '%'}
        )
    `;
    totalItems = countResult[0]?.total || 0;

    // 2. Datos Paginados
    customers = await db.$queryRaw<any[]>`
      SELECT c.*, 
             (SELECT COUNT(*)::int FROM tickets t WHERE t."customerId" = c.id) as "ticketCount"
      FROM customers c
      WHERE c."tenantId" = ${tenantId}
        AND (
          c.name % ${search} OR 
          c.email % ${search} OR 
          c.phone % ${search} OR
          c.nit ILIKE ${'%' + search + '%'}
        )
      ORDER BY similarity(c.name, ${search}) DESC
      LIMIT ${pageSize} OFFSET ${offset};
    `;

    // Normalizar para CustomersClient
    customers = customers.map((c: any) => ({
      ...c,
      _count: { tickets: c.ticketCount }
    }));
  } else {
    // 1. Conteo Estándar
    totalItems = await db.customer.count();

    // 2. Datos Paginados Estándar
    customers = await db.customer.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        dpi: true,
        nit: true,
        createdAt: true,
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: pageSize,
      skip: offset,
    });
  }

  const totalPages = Math.ceil(totalItems / pageSize);
  const isAdmin = session.user.role === 'ADMIN';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Clientes</h1>
          <p>Gestiona la base de datos de clientes y su historial</p>
        </div>
        <Button as={Link} href="/dashboard/customers/create" variant="primary">
          + Nuevo Cliente
        </Button>
      </div>

      <CustomerSearchFilters />

      <CustomersClient data={customers} isAdmin={isAdmin} />

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
