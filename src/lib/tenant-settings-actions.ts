'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';

// ==================== Types ====================

export interface TenantSettingsData {
  businessName?: string | null;
  businessNIT?: string | null;
  businessAddress?: string | null;
  businessPhone?: string | null;
  businessEmail?: string | null;
  taxRate?: number;
  taxName?: string;
  currency?: string;
  defaultPaymentTerms?: string | null;
  invoiceFooter?: string | null;
}

export interface TenantSettings {
  id: string;
  tenantId: string;
  businessName: string | null;
  businessNIT: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  taxRate: number;
  taxName: string;
  currency: string;
  defaultPaymentTerms: string | null;
  invoiceFooter: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Helper Functions ====================

function decimalToNumber(value: Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function transformSettings(settings: {
  id: string;
  tenantId: string;
  businessName: string | null;
  businessNIT: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  taxRate: Decimal;
  taxName: string;
  currency: string;
  defaultPaymentTerms: string | null;
  invoiceFooter: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TenantSettings {
  return {
    ...settings,
    taxRate: decimalToNumber(settings.taxRate),
  };
}

// ==================== Server Actions ====================

/**
 * Get tenant settings, creating default settings if they don't exist
 */
export async function getTenantSettings(): Promise<TenantSettings | null> {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Try to find existing settings
  let settings = await db.tenantSettings.findUnique({
    where: { tenantId: session.user.tenantId },
  });

  // If no settings exist, create default settings
  if (!settings) {
    // Get tenant name for default business name
    const tenant = await db.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { name: true },
    });

    settings = await db.tenantSettings.create({
      data: {
        tenantId: session.user.tenantId,
        businessName: tenant?.name || null,
        taxRate: 12, // Default IVA Guatemala
        taxName: 'IVA',
        currency: 'GTQ',
      },
    });
  }

  return transformSettings(settings);
}

/**
 * Update tenant settings
 */
export async function updateTenantSettings(data: TenantSettingsData): Promise<{ success: boolean; settings?: TenantSettings; error?: string }> {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return { success: false, error: 'No autorizado' };
  }

  // Validate tax rate
  if (data.taxRate !== undefined) {
    if (data.taxRate < 0 || data.taxRate > 100) {
      return { success: false, error: 'La tasa de impuesto debe estar entre 0 y 100' };
    }
  }

  // Validate email format if provided
  if (data.businessEmail && data.businessEmail.length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.businessEmail)) {
      return { success: false, error: 'El formato del email no es válido' };
    }
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  try {
    // Ensure settings exist
    const existingSettings = await db.tenantSettings.findUnique({
      where: { tenantId: session.user.tenantId },
    });

    let settings;
    if (existingSettings) {
      // Update existing settings
      settings = await db.tenantSettings.update({
        where: { tenantId: session.user.tenantId },
        data: {
          businessName: data.businessName,
          businessNIT: data.businessNIT,
          businessAddress: data.businessAddress,
          businessPhone: data.businessPhone,
          businessEmail: data.businessEmail || null,
          taxRate: data.taxRate,
          taxName: data.taxName,
          currency: data.currency,
          defaultPaymentTerms: data.defaultPaymentTerms,
          invoiceFooter: data.invoiceFooter,
        },
      });
    } else {
      // Create new settings
      settings = await db.tenantSettings.create({
        data: {
          tenantId: session.user.tenantId,
          businessName: data.businessName,
          businessNIT: data.businessNIT,
          businessAddress: data.businessAddress,
          businessPhone: data.businessPhone,
          businessEmail: data.businessEmail || null,
          taxRate: data.taxRate ?? 12,
          taxName: data.taxName ?? 'IVA',
          currency: data.currency ?? 'GTQ',
          defaultPaymentTerms: data.defaultPaymentTerms,
          invoiceFooter: data.invoiceFooter,
        },
      });
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/settings/business');

    return { success: true, settings: transformSettings(settings) };
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

  const settings = await db.tenantSettings.findUnique({
    where: { tenantId: session.user.tenantId },
    select: { taxRate: true },
  });

  return settings ? decimalToNumber(settings.taxRate) : 12;
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

  const settings = await db.tenantSettings.findUnique({
    where: { tenantId: session.user.tenantId },
  });

  const tenant = await db.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { name: true },
  });

  // Return merged data with fallbacks
  return {
    businessName: settings?.businessName || tenant?.name || 'Sin nombre',
    businessNIT: settings?.businessNIT || null,
    businessAddress: settings?.businessAddress || null,
    businessPhone: settings?.businessPhone || null,
    businessEmail: settings?.businessEmail || null,
    taxRate: settings ? decimalToNumber(settings.taxRate) : 12,
    taxName: settings?.taxName || 'IVA',
    currency: settings?.currency || 'GTQ',
    invoiceFooter: settings?.invoiceFooter || null,
  };
}
