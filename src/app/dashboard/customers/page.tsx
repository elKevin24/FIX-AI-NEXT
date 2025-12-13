import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { Card, CardHeader, CardTitle, CardBody, Badge, Button } from '@/components/ui';
import Link from 'next/link';
import DeleteCustomerButton from './DeleteCustomerButton'; // Assuming this is needed for the Card UI

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
      // tenant: true, // Only if isSuperAdmin logic needs to display tenant name, otherwise removed for brevity
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const isAdmin = session.user.role === 'ADMIN';
  // const isSuperAdmin = session.user.email === 'adminkev@example.com'; // Removed as it's not directly used in the Card UI for display, but could be used for conditional DeleteCustomerButton

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
          {customers.map((customer: typeof customers[number]) => (
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
                {customer.dpi && (
                  <div style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-2)' }}>
                    <strong>DPI:</strong> {customer.dpi}
                  </div>
                )}
                {customer.nit && (
                  <div style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-2)' }}>
                    <strong>NIT:</strong> {customer.nit}
                  </div>
                )}
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--spacing-2)' }}>
                  Customer since: {new Date(customer.createdAt).toLocaleDateString()}
                </div>
              </CardBody>
              <div className="flex gap-2" style={{ padding: 'var(--spacing-4)', paddingTop: '0' }}>
                <Link href={`/dashboard/customers/${customer.id}/edit`} style={{ flex: 1 }}>
                  <Button variant="secondary" size="sm" style={{ width: '100%' }}>
                    Edit
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