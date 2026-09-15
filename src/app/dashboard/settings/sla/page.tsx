
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SLASettingsForm from './SLASettingsForm';

export default async function SLASettingsPage() {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId: session.user.tenantId }
    });

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">SLA Configuration</h1>
            <p className="mb-6 text-gray-600">Configure Service Level Agreement (SLA) alerts for your tickets.</p>
            
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
