import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { Card, CardHeader, CardTitle, CardBody, Badge, Button } from '@/components/ui';
import Link from 'next/link';
import DeleteCustomerButton from './DeleteCustomerButton';
import styles from './customers.module.css';

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
          <p>Administra los clientes del taller</p>
        </div>
        <Link href="/dashboard/customers/create">
          <Button variant="primary">+ Nuevo Cliente</Button>
        </Link>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardBody>
            <div className={styles.emptyState}>
              <p>No hay clientes registrados</p>
              <Link href="/dashboard/customers/create">
                <Button variant="primary">Agregar Primer Cliente</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className={styles.customersGrid}>
          {customers.map((customer) => (
            <Card key={customer.id} className={styles.customerCard}>
              <CardHeader>
                <div className={styles.cardHeader}>
                  <div className={styles.customerInfo}>
                    <h3 className={styles.customerName}>{customer.name}</h3>
                    {customer.email && (
                      <p className={styles.customerEmail}>{customer.email}</p>
                    )}
                  </div>
                  <Badge variant={customer._count.tickets > 0 ? 'primary' : 'gray'}>
                    {customer._count.tickets} {customer._count.tickets === 1 ? 'Ticket' : 'Tickets'}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody>
                {customer.phone && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Teléfono:</span>
                    <span className={styles.infoValue}>{customer.phone}</span>
                  </div>
                )}
                {customer.address && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Dirección:</span>
                    <span className={styles.infoValue}>{customer.address}</span>
                  </div>
                )}
                {customer.dpi && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>DPI:</span>
                    <span className={styles.infoValue}>{customer.dpi}</span>
                  </div>
                )}
                {customer.nit && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>NIT:</span>
                    <span className={styles.infoValue}>{customer.nit}</span>
                  </div>
                )}
                <div className={styles.customerSince}>
                  Cliente desde: {new Date(customer.createdAt).toLocaleDateString('es-ES')}
                </div>
              </CardBody>
              <div className={styles.cardActions}>
                <Link href={`/dashboard/customers/${customer.id}/edit`}>
                  <Button variant="secondary" size="sm">
                    Editar
                  </Button>
                </Link>
                {isAdmin && customer._count.tickets === 0 && (
                  <DeleteCustomerButton customerId={customer.id} customerName={customer.name} />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}