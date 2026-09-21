'use server';

/**
 * POS Server Actions (Thin Controller)
 * Delegating domain transactions and calculations to POSUseCases.
 */

import { requireTenantSession, assertNotViewer } from '@/lib/auth-context';
import { revalidatePath } from 'next/cache';
import { getTaxRate } from './tenant-settings-actions';
import { CreatePOSSaleSchema } from '@/lib/schemas';
import {
  POSCartItem,
  POSPaymentItem,
  CreatePOSSaleData,
  POSSaleFilters,
  CreatePOSSaleUseCase,
  VoidPOSSaleUseCase,
  GetPOSSalesUseCase,
  GetPartsForPOSUseCase,
  GetCustomersForPOSUseCase,
  GetPOSSalesStatsUseCase,
} from '@/use-cases/pos';

export type { POSCartItem, POSPaymentItem, CreatePOSSaleData, POSSaleFilters };

function revalidatePOSPaths() {
  revalidatePath('/dashboard/pos');
  revalidatePath('/dashboard/pos/history');
  revalidatePath('/dashboard/parts');
}

/**
 * Returns parts with available stock for the POS product picker.
 */
export async function getPartsForPOS(search?: string) {
  const { db } = await requireTenantSession();
  return await GetPartsForPOSUseCase.execute(search, db);
}

/**
 * Creates a POS sale with atomically validated stock and mixed-payment support.
 */
export async function createPOSSale(rawData: CreatePOSSaleData) {
  const { tenantId, userId, userRole, db } = await requireTenantSession();
  await assertNotViewer(userRole, 'realizar ventas');

  const validatedFields = CreatePOSSaleSchema.safeParse(rawData);
  if (!validatedFields.success) {
    throw new Error(`Datos inválidos: ${validatedFields.error.errors[0]?.message ?? 'Datos inválidos'}`);
  }

  const taxRate = await getTaxRate();
  const sale = await CreatePOSSaleUseCase.execute(
    validatedFields.data,
    taxRate,
    tenantId,
    userId,
    db
  );

  revalidatePOSPaths();
  return sale;
}

/**
 * Voids a completed POS sale. Stock is restored by the DB trigger
 * `trg_restore_stock_on_void`. Cash refunds are recorded in the cash register.
 */
export async function voidPOSSale(saleId: string, reason: string) {
  const { tenantId, userId, userRole, db } = await requireTenantSession();
  await assertNotViewer(userRole, 'anular ventas');

  const result = await VoidPOSSaleUseCase.execute(
    saleId,
    reason,
    tenantId,
    userId,
    db
  );

  revalidatePOSPaths();
  return result;
}

/**
 * Returns POS sales with optional filters applied.
 */
export async function getPOSSales(filters?: POSSaleFilters) {
  const { tenantId, db } = await requireTenantSession();
  return await GetPOSSalesUseCase.execute(filters, tenantId, db);
}

/**
 * Returns customers for the POS customer selector (max 20 results).
 */
export async function getCustomersForPOS(search?: string) {
  const { tenantId, db } = await requireTenantSession();
  return await GetCustomersForPOSUseCase.execute(search, tenantId, db);
}

/**
 * Returns aggregated POS sales statistics for a time range.
 */
export async function getPOSSalesStats(from?: Date, to?: Date) {
  const { tenantId, db } = await requireTenantSession();
  return await GetPOSSalesStatsUseCase.execute(from, to, tenantId, db);
}
