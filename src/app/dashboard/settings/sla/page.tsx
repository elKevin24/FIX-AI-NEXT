import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { redirect } from 'next/navigation';
import SLASettingsForm from './SLASettingsForm';
import PageHeader from '@/components/PageHeader';
import { Card } from '@/components/ui';

export const metadata = {
    title: 'Configuración SLA',
    description: 'Umbrales y notificaciones de Acuerdos de Nivel de Servicio (SLA) para tickets.',
    openGraph: {
        title: 'Configuración SLA | FIX Workshop',
        description: 'Umbrales y notificaciones de Acuerdos de Nivel de Servicio (SLA) para tickets.',
    },
};

export default async function SLASettingsPage() {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    const settings = await db.tenantSettings.findUnique({
        where: { tenantId: session.user.tenantId }
    });

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <PageHeader
                title="Configuración SLA"
                subtitle="Configura las alertas de Service Level Agreement (SLA) para tus tickets."
            />
            
            <Card style={{ maxWidth: '42rem', padding: 'var(--space-6)' }}>
                <SLASettingsForm 
                    initialSettings={settings || {
                        slaWarningPercent: 70,
                        slaCriticalPercent: 90,
                        slaEmailEnabled: true,
                        slaInAppEnabled: true
                    }} 
                />
            </Card>
        </div>
    );
}
