'use server';

/**
 * Cash Register Server Actions (Thin Controller)
 * Delegating domain transactions, audits and cuts to CashRegister use cases.
 */

import { revalidatePath } from 'next/cache';
import { requireTenantSession, assertNotViewer } from '@/lib/auth-context';
import {
  OpenCashRegisterSchema,
  CashTransactionSchema,
  CloseCashRegisterSchema,
} from '@/lib/schemas';
import {
  GenerateCashCutUseCase,
  CutType,
  OpenCashRegisterActionUseCase,
  GetOpenCashRegisterUseCase,
  GetCashRegistersUseCase,
  RegisterCashTransactionUseCase,
  CloseCashRegisterActionUseCase,
  GetCashRegisterStatsUseCase,
  RegisterInvoicePaymentInCashUseCase,
} from '@/use-cases/cash-register';

// ============================================================================
// TYPES
// ============================================================================

export interface CashRegisterData {
  name: string;
  openingBalance: number;
}

export interface CashTransactionData {
  cashRegisterId: string;
  type: 'INCOME' | 'EXPENSE' | 'WITHDRAWAL';
  amount: number;
  description: string;
  reference?: string;
}

export interface CloseCashRegisterData {
  cashRegisterId: string;
  closingBalance: number;
  notes?: string;
}

// ============================================================================
// CASH REGISTER MANAGEMENT
// ============================================================================

/**
 * Abre una caja registradora con un saldo inicial
 */
export async function openCashRegister(data: CashRegisterData) {
  const { tenantId, userId, userRole, db } = await requireTenantSession();
  await assertNotViewer(userRole, 'abrir cajas');

  const validatedFields = OpenCashRegisterSchema.safeParse(data);
  if (!validatedFields.success) {
    throw new Error(`Datos inválidos: ${validatedFields.error.errors[0]?.message ?? 'Datos inválidos'}`);
  }

  const cashRegister = await OpenCashRegisterActionUseCase.execute(
    validatedFields.data,
    tenantId,
    userId,
    db
  );

  revalidatePath('/dashboard/cash-register');
  return cashRegister;
}

/**
 * Obtiene la caja abierta actualmente
 */
export async function getOpenCashRegister() {
  try {
    const { tenantId, db } = await requireTenantSession();
    return await GetOpenCashRegisterUseCase.execute(tenantId, db);
  } catch {
    return null;
  }
}

/**
 * Obtiene todas las cajas (historial)
 */
export async function getCashRegisters(filters?: { from?: Date; to?: Date }) {
  try {
    const { tenantId, db } = await requireTenantSession();
    return await GetCashRegistersUseCase.execute(filters, tenantId, db);
  } catch {
    return [];
  }
}

/**
 * Registra una transacción de caja
 */
export async function registerCashTransaction(data: CashTransactionData) {
  const { tenantId, userId, userRole, db } = await requireTenantSession();
  await assertNotViewer(userRole, 'registrar transacciones');

  const validatedFields = CashTransactionSchema.safeParse(data);
  if (!validatedFields.success) {
    throw new Error(`Datos inválidos: ${validatedFields.error.errors[0]?.message ?? 'Datos inválidos'}`);
  }

  const transaction = await RegisterCashTransactionUseCase.execute(
    validatedFields.data,
    tenantId,
    userId,
    db
  );

  revalidatePath('/dashboard/cash-register');
  return transaction;
}

/**
 * Cierra una caja registradora
 */
export async function closeCashRegister(data: CloseCashRegisterData) {
  const { tenantId, userId, userRole, db } = await requireTenantSession();
  await assertNotViewer(userRole, 'cerrar cajas');

  const validatedFields = CloseCashRegisterSchema.safeParse(data);
  if (!validatedFields.success) {
    throw new Error(`Datos inválidos: ${validatedFields.error.errors[0]?.message ?? 'Datos inválidos'}`);
  }

  const updated = await CloseCashRegisterActionUseCase.execute(
    validatedFields.data,
    tenantId,
    userId,
    db
  );

  revalidatePath('/dashboard/cash-register');
  return updated;
}

/**
 * Obtiene estadísticas de caja
 */
export async function getCashRegisterStats(cashRegisterId: string) {
  try {
    const { tenantId, db } = await requireTenantSession();
    return await GetCashRegisterStatsUseCase.execute(cashRegisterId, tenantId, db);
  } catch {
    return null;
  }
}

/**
 * Registra un ingreso de efectivo desde un pago de factura
 */
export async function registerInvoicePaymentInCash(
  invoiceId: string,
  amount: number
) {
  const { tenantId, userId, userRole, db } = await requireTenantSession();
  await assertNotViewer(userRole, 'registrar pagos');

  const transaction = await RegisterInvoicePaymentInCashUseCase.execute(
    invoiceId,
    amount,
    tenantId,
    userId,
    db
  );

  revalidatePath('/dashboard/cash-register');
  return transaction;
}

/**
 * Server Action para generar arqueos y cortes de caja (Corte X y Corte Z).
 */
export async function generateCashCutAction(
  cashRegisterId: string,
  cutType: CutType,
  physicalCashReported?: number,
) {
  const { tenantId, userId } = await requireTenantSession();

  const result = await GenerateCashCutUseCase.execute({
    cashRegisterId,
    cutType,
    physicalCashReported,
    tenantId,
    userId,
  });

  revalidatePath('/dashboard/cash-register');
  return result;
}
