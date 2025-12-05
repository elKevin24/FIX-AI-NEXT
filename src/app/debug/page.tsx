import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function DebugPage() {
    const session = await auth();

    // Get all tickets (sin filtro)
    const allTickets = await prisma.ticket.findMany({
        include: {
            customer: true,
            tenant: true,
        },
    });

    // Get all tenants
    const allTenants = await prisma.tenant.findMany();

    // Get user info
    const user = session?.user?.id
        ? await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { tenant: true },
        })
        : null;

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>🔍 Debug Info</h1>

            <section style={{ background: '#f0f0f0', padding: '15px', margin: '10px 0', borderRadius: '5px' }}>
                <h2>Session Info</h2>
                <pre>{JSON.stringify(session, null, 2)}</pre>
            </section>

            <section style={{ background: '#f0f0f0', padding: '15px', margin: '10px 0', borderRadius: '5px' }}>
                <h2>User from DB</h2>
                <pre>{JSON.stringify(user, null, 2)}</pre>
            </section>

            <section style={{ background: '#f0f0f0', padding: '15px', margin: '10px 0', borderRadius: '5px' }}>
                <h2>All Tenants</h2>
                <pre>{JSON.stringify(allTenants, null, 2)}</pre>
            </section>

            <section style={{ background: '#f0f0f0', padding: '15px', margin: '10px 0', borderRadius: '5px' }}>
                <h2>All Tickets ({allTickets.length})</h2>
                {allTickets.map(ticket => (
                    <div key={ticket.id} style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '3px' }}>
                        <strong>{ticket.title}</strong>
                        <br />
                        Tenant: {ticket.tenant.name} (ID: {ticket.tenantId})
                        <br />
                        Customer: {ticket.customer.name}
                        <br />
                        Status: {ticket.status}
                    </div>
                ))}
            </section>
        </div>
    );
}
