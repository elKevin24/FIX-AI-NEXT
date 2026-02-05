import { auth } from "@/auth";
import { getAuditLogs } from "@/lib/audit-actions";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AuditLogsPage({
    searchParams,
}: {
    searchParams: { page?: string; action?: string; module?: string };
}) {
    const session = await auth();

    if (session?.user?.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    const tenantId = session.user.tenantId;
    const page = Number(searchParams.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const { logs, total } = await getAuditLogs(tenantId, limit, offset, {
        action: searchParams.action as any,
        module: searchParams.module as any
    });

    const totalPages = Math.ceil(total / limit);

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Bitácora de Auditoría</h1>
                <div>
                   <span style={{color: '#6b7280'}}>Total: {total} eventos</span>
                </div>
            </div>

            <div style={{ overflowX: 'auto', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                            <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#6b7280' }}>Fecha</th>
                            <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#6b7280' }}>Usuario</th>
                            <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#6b7280' }}>Acción</th>
                            <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#6b7280' }}>Módulo</th>
                            <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#6b7280' }}>Detalles</th>
                            <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#6b7280' }}>IP</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                        {logs.map((log) => (
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
                                        fontWeight: 600,
                                        backgroundColor: log.success ? '#d1fae5' : '#fee2e2',
                                        color: log.success ? '#065f46' : '#991b1b'
                                    }}>
                                        {log.action}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem 1.5rem' }}>{log.module}</td>
                                <td style={{ padding: '1rem 1.5rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {log.entityType && <span style={{ marginRight: '0.5rem', fontWeight: 600 }}>{log.entityType}:</span>}
                                    {JSON.stringify(log.metadata)}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace' }}>{log.ipAddress}</td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                             <tr>
                                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                                    No hay registros de auditoría.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', gap: '0.5rem' }}>
                {page > 1 && (
                    <Link href={`?page=${page - 1}`} style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white' }}>
                        Anterior
                    </Link>
                )}
                <span style={{ padding: '0.5rem 1rem' }}>Página {page} de {totalPages || 1}</span>
                {page < totalPages && (
                     <Link href={`?page=${page + 1}`} style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white' }}>
                        Siguiente
                    </Link>
                )}
            </div>
        </div>
    );
}
