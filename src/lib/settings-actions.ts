
'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateSLASettings(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== 'ADMIN') {
        return { success: false, message: 'Unauthorized' };
    }

    const slaWarningPercent = Number(formData.get('slaWarningPercent'));
    const slaCriticalPercent = Number(formData.get('slaCriticalPercent'));
    const slaEmailEnabled = formData.get('slaEmailEnabled') === 'on';
    const slaInAppEnabled = formData.get('slaInAppEnabled') === 'on';

    try {
        await prisma.tenantSettings.upsert({
            where: { tenantId: session.user.tenantId },
            update: {
                slaWarningPercent,
                slaCriticalPercent,
                slaEmailEnabled,
                slaInAppEnabled
            },
            create: {
                tenantId: session.user.tenantId,
                slaWarningPercent,
                slaCriticalPercent,
                slaEmailEnabled,
                slaInAppEnabled
            }
        });

        revalidatePath('/dashboard/settings/sla');
        return { success: true, message: 'Settings updated successfully' };
    } catch (error) {
        console.error('Failed to update settings:', error);
        return { success: false, message: 'Failed to update settings' };
    }
}
