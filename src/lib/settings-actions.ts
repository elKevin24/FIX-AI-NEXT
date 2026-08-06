
'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
import { UpdateSLASettingsSchema } from '@/lib/schemas';

export async function updateSLASettings(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== 'ADMIN') {
        return { success: false, message: 'Unauthorized' };
    }

    const rawData = {
        slaWarningPercent: Number(formData.get('slaWarningPercent')),
        slaCriticalPercent: Number(formData.get('slaCriticalPercent')),
        slaEmailEnabled: formData.get('slaEmailEnabled') === 'on',
        slaInAppEnabled: formData.get('slaInAppEnabled') === 'on',
    };

    const validatedFields = UpdateSLASettingsSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return { 
            success: false, 
            message: 'Datos inválidos', 
            errors: validatedFields.error.flatten().fieldErrors 
        };
    }

    const { slaWarningPercent, slaCriticalPercent, slaEmailEnabled, slaInAppEnabled } = validatedFields.data;
    const db = getTenantPrisma(session.user.tenantId, session.user.id);

    try {
        await db.tenantSettings.upsert({
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
