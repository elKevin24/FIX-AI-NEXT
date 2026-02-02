import React from 'react';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { redirect, notFound } from 'next/navigation';
import AvailabilityList from '@/components/technicians/AvailabilityList';
import AvailabilityPageClient from './AvailabilityPageClient'; // Client wrapper for the Add Dialog

export default async function AvailabilityPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await auth();
    if (!session?.user) redirect('/login');

    const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);
    const targetUserId = params.id;

    // Fetch Target User
    const targetUser = await tenantDb.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, email: true, role: true, status: true, maxConcurrentTickets: true }
    });

    if (!targetUser) notFound();

    // Security: Only Admin or the User themselves can view/edit
    const canEdit = session.user.role === 'ADMIN' || session.user.id === targetUserId;
    if (!canEdit) {
        return <div>No tienes permiso para ver esta página.</div>;
    }

    // Fetch Unavailabilities
    const absences = await tenantDb.technicianUnavailability.findMany({
        where: { userId: targetUserId },
        orderBy: { startDate: 'desc' }
    });

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                        Disponibilidad: {targetUser.name || targetUser.email}
                    </h1>
                    <p style={{ color: '#64748b' }}>
                        Estado actual: 
                        <span style={{ 
                            marginLeft: '0.5rem', 
                            fontWeight: 'bold',
                            color: targetUser.status === 'AVAILABLE' ? '#16a34a' : '#ef4444' 
                        }}>
                            {targetUser.status}
                        </span>
                    </p>
                </div>
                
                {/* Client Component for "Add Absence" Button & Dialog */}
                <AvailabilityPageClient userId={targetUserId} />
             </div>

             <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                 <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                     <h3 style={{ fontWeight: 600 }}>Historial de Ausencias</h3>
                 </div>
                 <AvailabilityList absences={absences} canEdit={canEdit} />
             </div>
        </div>
    );
}
