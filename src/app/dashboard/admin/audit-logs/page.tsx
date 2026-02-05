import { auth } from "@/auth";
import { getAuditLogs } from "@/lib/audit-actions";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AuditLogsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const session = await auth();

    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        redirect("/dashboard");
    }

    const tenantId = session.user.tenantId;
    const limit = Number(searchParams.limit) || 50;
    const offset = Number(searchParams.offset) || 0;

    const { logs, total } = await getAuditLogs(tenantId, limit, offset, {
        action: searchParams.action as any
    });

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Audit Logs</h1>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Total: {total} registros
                </div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                            <th style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>Fecha</th>
                            <th style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>Usuario</th>
                            <th style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>Acción</th>
                            <th style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>Detalles</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log: any) => (
                            <tr key={log.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap' }}>
                                    {new Date(log.createdAt).toLocaleString()}
                                </td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    <div style={{ fontWeight: 500 }}>{log.user?.name || 'Sistema'}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{log.user?.email}</div>
                                </td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    <span style={{ 
                                        padding: '0.25rem 0.5rem', 
                                        borderRadius: '9999px', 
                                        fontSize: '0.75rem', 
                                        fontWeight: 500,
                                        backgroundColor: '#eff6ff',
                                        color: '#1e40af'
                                    }}>
                                        {log.action}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem 1.5rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {log.details || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                {offset > 0 && (
                    <Link 
                        href={`/dashboard/admin/audit-logs?offset=${Math.max(0, offset - limit)}`}
                        style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', textDecoration: 'none', color: '#374151' }}
                    >
                        Anterior
                    </Link>
                )}
                {offset + limit < total && (
                    <Link 
                        href={`/dashboard/admin/audit-logs?offset=${offset + limit}`}
                        style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', textDecoration: 'none', color: '#374151' }}
                    >
                        Siguiente
                    </Link>
                )}
            </div>
        </div>
    );
}