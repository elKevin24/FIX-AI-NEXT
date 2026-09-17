import { Prisma } from '@prisma/client';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { z } from 'zod';
import { UpdateTenantSettingsSchema } from '@/lib/schemas';

type TenantDb = ReturnType<typeof getTenantPrisma>;

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

export function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function transformSettings(settings: {
  id: string;
  tenantId: string;
  businessName: string | null;
  businessNIT: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  taxRate: Prisma.Decimal;
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

export class GetTenantSettingsUseCase {
  static async execute(tenantId: string, db: TenantDb): Promise<TenantSettings> {
    let settings = await db.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      });

      settings = await db.tenantSettings.create({
        data: {
          tenantId,
          businessName: tenant?.name || null,
          taxRate: 12,
          taxName: 'IVA',
          currency: 'GTQ',
        },
      });
    }

    return transformSettings(settings);
  }
}

export class UpdateTenantSettingsUseCase {
  static async execute(
    validData: z.infer<typeof UpdateTenantSettingsSchema>,
    tenantId: string,
    db: TenantDb
  ): Promise<TenantSettings> {
    const existingSettings = await db.tenantSettings.findUnique({
      where: { tenantId },
    });

    let settings;
    if (existingSettings) {
      settings = await db.tenantSettings.update({
        where: { tenantId },
        data: {
          businessName: validData.businessName,
          businessNIT: validData.businessNIT,
          businessAddress: validData.businessAddress,
          businessPhone: validData.businessPhone,
          businessEmail: validData.businessEmail || null,
          taxRate: validData.taxRate,
          taxName: validData.taxName,
          currency: validData.currency,
          defaultPaymentTerms: validData.defaultPaymentTerms,
          invoiceFooter: validData.invoiceFooter,
        },
      });
    } else {
      settings = await db.tenantSettings.create({
        data: {
          tenantId,
          businessName: validData.businessName || '',
          businessNIT: validData.businessNIT || '',
          businessAddress: validData.businessAddress || '',
          businessPhone: validData.businessPhone || '',
          businessEmail: validData.businessEmail || null,
          taxRate: validData.taxRate || 0,
          taxName: validData.taxName || 'IVA',
          currency: validData.currency || 'GTQ',
          defaultPaymentTerms: validData.defaultPaymentTerms || '',
          invoiceFooter: validData.invoiceFooter || '',
        },
      });
    }

    return transformSettings(settings);
  }
}

export class GetTaxRateUseCase {
  static async execute(tenantId: string, db: TenantDb): Promise<number> {
    const settings = await db.tenantSettings.findUnique({
      where: { tenantId },
      select: { taxRate: true },
    });

    return settings ? decimalToNumber(settings.taxRate) : 12;
  }
}

export class GetTenantSettingsForDocumentsUseCase {
  static async execute(tenantId: string, db: TenantDb) {
    const settings = await db.tenantSettings.findUnique({
      where: { tenantId },
    });

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

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
}
