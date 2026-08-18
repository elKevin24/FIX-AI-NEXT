
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SLASettingsForm from './SLASettingsForm';
import PageHeader from '@/components/PageHeader';

export default async function SLASettingsPage() {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId: session.user.tenantId }
    });

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <PageHeader
                title="Configuración SLA"
                subtitle="Configura las alertas de Service Level Agreement (SLA) para tus tickets."
            />
            
            <div className="bg-white p-6 rounded-lg shadow max-w-2xl">
                <SLASettingsForm 
                    initialSettings={settings || {
                        slaWarningPercent: 70,
                        slaCriticalPercent: 90,
                        slaEmailEnabled: true,
                        slaInAppEnabled: true
                    }} 
                />
            </div>
        </div>
    );
}
