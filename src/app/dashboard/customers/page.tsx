import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import styles from '../tickets/tickets.module.css';
import Link from 'next/link';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { Card, CardHeader, CardTitle, CardBody, Badge, Button } from '@/components/ui';
import Link from 'next/link';
import DeleteCustomerButton from './DeleteCustomerButton';

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
      createdAt: true,
      _count: {
        select: {
          tickets: true,
        },
        include: {
            tickets: {
                select: {
                    id: true,
                    status: true,
                },
            },
            tenant: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Clientes</h1>
                {isSuperAdmin && (
                    <span className={styles.superAdminBadge}>
                        👑 Super Admin
                    </span>
                )}
                <Link href="/dashboard/customers/create" className={styles.createBtn}>
                    + Nuevo Cliente
                </Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Teléfono</th>
                            {isSuperAdmin && <th>Tenant</th>}
                            <th>Total Tickets</th>
                            <th>Tickets Activos</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map((customer) => {
                            const activeTickets = customer.tickets.filter(
                                t => t.status === 'OPEN' || t.status === 'IN_PROGRESS'
                            ).length;

                            return (
                                <tr key={customer.id}>
                                    <td>{customer.name}</td>
                                    <td>{customer.email || '-'}</td>
                                    <td>{customer.phone || '-'}</td>
                                    {isSuperAdmin && <td>{customer.tenant.name}</td>}
                                    <td>{customer.tickets.length}</td>
                                    <td>
                                        <span className={`${styles.status} ${activeTickets > 0 ? styles.in_progress : styles.closed}`}>
                                            {activeTickets}
                                        </span>
                                    </td>
                                    <td>
                                        <Link
                                            href={`/dashboard/customers/${customer.id}/edit`}
                                            className={styles.viewLink}
                                        >
                                            Editar
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                        {customers.length === 0 && (
                            <tr>
                                <td colSpan={isSuperAdmin ? 7 : 6} className={styles.empty}>
                                    No se encontraron clientes
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const isAdmin = session.user.role === 'ADMIN';

  return (
    <div style={{ padding: 'var(--spacing-6)' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--spacing-6)' }}>
        <div>
          <h1 style={{ marginBottom: 'var(--spacing-2)' }}>Customers</h1>
          <p className="text-secondary">Manage your workshop customers</p>
        </div>
        <Link href="/dashboard/customers/create">
          <Button variant="primary">+ Add Customer</Button>
        </Link>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center" style={{ padding: 'var(--spacing-8)' }}>
              <p className="text-secondary" style={{ marginBottom: 'var(--spacing-4)' }}>
                No customers found
              </p>
              <Link href="/dashboard/customers/create">
                <Button variant="primary">Add Your First Customer</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 'var(--spacing-4)' }}>
          {customers.map((customer) => (
            <Card key={customer.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div style={{ flex: 1 }}>
                    <CardTitle>{customer.name}</CardTitle>
                    {customer.email && (
                      <p className="text-secondary" style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-2)' }}>
                        {customer.email}
                      </p>
                    )}
                  </div>
                  <Badge variant={customer._count.tickets > 0 ? 'primary' : 'gray'}>
                    {customer._count.tickets} {customer._count.tickets === 1 ? 'Ticket' : 'Tickets'}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody>
                {customer.phone && (
                  <div style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-2)' }}>
                    <strong>Phone:</strong> {customer.phone}
                  </div>
                )}
                {customer.address && (
                  <div style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-2)' }}>
                    <strong>Address:</strong> {customer.address}
                  </div>
                )}
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--spacing-2)' }}>
                  Customer since: {new Date(customer.createdAt).toLocaleDateString()}
                </div>
              </CardBody>
              <div className="flex gap-2" style={{ padding: 'var(--spacing-4)', paddingTop: '0' }}>
                <Link href={`/dashboard/customers/${customer.id}`} style={{ flex: 1 }}>
                  <Button variant="secondary" size="sm" style={{ width: '100%' }}>
                    View Details
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
