import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { Button } from '@/components/ui';
import Link from 'next/link';
import styles from './customers.module.css';
import CustomersClient from './CustomersClient';

export default async function CustomersPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  const db = getTenantPrisma(session.user.tenantId);

  const customers = await db.customer.findMany({
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
  });

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

      <CustomersClient data={customers} isAdmin={isAdmin} />
    </div>
  );
}