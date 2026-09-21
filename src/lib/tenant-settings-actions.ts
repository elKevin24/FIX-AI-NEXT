'use server';

/**
 * Tenant Settings Server Actions (Thin Controller)
 * Delegating settings persistence and calculations to TenantSettingsUseCases.
 */

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
import { UpdateTenantSettingsSchema } from '@/lib/schemas';
import {
  TenantSettingsData,
  TenantSettings,
  GetTenantSettingsUseCase,
  UpdateTenantSettingsUseCase,
  GetTaxRateUseCase,
  GetTenantSettingsForDocumentsUseCase,
} from '@/use-cases/tenant-settings';

export type { TenantSettingsData, TenantSettings };

/**
 * Get tenant settings, creating default settings if they don't exist
 */
export async function getTenantSettings(): Promise<TenantSettings | null> {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);
  return await GetTenantSettingsUseCase.execute(session.user.tenantId, db);
}

/**
 * Update tenant settings
 */
export async function updateTenantSettings(data: TenantSettingsData): Promise<{ 
  success: boolean; 
  settings?: TenantSettings; 
  error?: string; 
  errors?: Record<string, string[] | undefined>;
}> {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return { success: false, error: 'No autorizado' };
  }

  const validatedFields = UpdateTenantSettingsSchema.safeParse(data);
  if (!validatedFields.success) {
    return { 
      success: false, 
      error: 'Datos inválidos', 
      errors: validatedFields.error.flatten().fieldErrors 
    };
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  try {
    const settings = await UpdateTenantSettingsUseCase.execute(
      validatedFields.data,
      session.user.tenantId,
      db
    );

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/settings/business');

    return { success: true, settings };
  } catch (error) {
    console.error('Error updating tenant settings:', error);
    return { success: false, error: 'Error al actualizar la configuración' };
  }
}

/**
 * Get the tax rate for the current tenant
 * Used by invoice generation to get dynamic tax rate
 */
export async function getTaxRate(): Promise<number> {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return 12; // Default fallback
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);
  return await GetTaxRateUseCase.execute(session.user.tenantId, db);
}

/**
 * Get tenant settings for PDF/documents (includes tenant name)
 */
export async function getTenantSettingsForDocuments(): Promise<{
  businessName: string;
  businessNIT: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  taxRate: number;
  taxName: string;
  currency: string;
  invoiceFooter: string | null;
} | null> {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return null;
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);
  return await GetTenantSettingsForDocumentsUseCase.execute(session.user.tenantId, db);
}
