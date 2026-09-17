'use server';

/**
 * Cash Register Server Actions (Thin Controller)
 * Delegating domain transactions, audits and cuts to CashRegister use cases.
 */

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
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

function assertNotViewer(role?: string, action: string = 'realizar esta acción') {
  if (role === 'VIEWER') {
    throw new Error(`Los observadores no pueden ${action}`);
  }
}

// ============================================================================
// CASH REGISTER MANAGEMENT
// ============================================================================

/**
 * Abre una caja registradora con un saldo inicial
 */
export async function openCashRegister(data: CashRegisterData) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('No autorizado');
  assertNotViewer(session.user.role, 'abrir cajas');

  const validatedFields = OpenCashRegisterSchema.safeParse(data);
  if (!validatedFields.success) {
    throw new Error(`Datos inválidos: ${validatedFields.error.errors[0]?.message ?? 'Datos inválidos'}`);
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);
  const cashRegister = await OpenCashRegisterActionUseCase.execute(
    validatedFields.data,
    session.user.tenantId,
    session.user.id,
    db
  );

  revalidatePath('/dashboard/cash-register');
  return cashRegister;
}

/**
 * Obtiene la caja abierta actualmente
 */
export async function getOpenCashRegister() {
  const session = await auth();
  if (!session?.user?.tenantId) return null;

  const db = getTenantPrisma(session.user.tenantId, session.user.id);
  return await GetOpenCashRegisterUseCase.execute(session.user.tenantId, db);
}

/**
 * Obtiene todas las cajas (historial)
 */
export async function getCashRegisters(filters?: { from?: Date; to?: Date }) {
  const session = await auth();
  if (!session?.user?.tenantId) return [];

  const db = getTenantPrisma(session.user.tenantId, session.user.id);
  return await GetCashRegistersUseCase.execute(filters, session.user.tenantId, db);
}

/**
 * Registra una transacción de caja
 */
export async function registerCashTransaction(data: CashTransactionData) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('No autorizado');
  assertNotViewer(session.user.role, 'registrar transacciones');

  const validatedFields = CashTransactionSchema.safeParse(data);
  if (!validatedFields.success) {
    throw new Error(`Datos inválidos: ${validatedFields.error.errors[0]?.message ?? 'Datos inválidos'}`);
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);
  const transaction = await RegisterCashTransactionUseCase.execute(
    validatedFields.data,
    session.user.tenantId,
    session.user.id,
    db
  );

  revalidatePath('/dashboard/cash-register');
  return transaction;
}

/**
 * Cierra una caja registradora
 */
export async function closeCashRegister(data: CloseCashRegisterData) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('No autorizado');
  assertNotViewer(session.user.role, 'cerrar cajas');

  const validatedFields = CloseCashRegisterSchema.safeParse(data);
  if (!validatedFields.success) {
    throw new Error(`Datos inválidos: ${validatedFields.error.errors[0]?.message ?? 'Datos inválidos'}`);
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);
  const updated = await CloseCashRegisterActionUseCase.execute(
    validatedFields.data,
    session.user.tenantId,
    session.user.id,
    db
  );

  revalidatePath('/dashboard/cash-register');
  return updated;
}

/**
 * Obtiene estadísticas de caja
 */
export async function getCashRegisterStats(cashRegisterId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;

  const db = getTenantPrisma(session.user.tenantId, session.user.id);
  return await GetCashRegisterStatsUseCase.execute(cashRegisterId, session.user.tenantId, db);
}

/**
 * Registra un ingreso de efectivo desde un pago de factura
 */
export async function registerInvoicePaymentInCash(
  invoiceId: string,
  amount: number
) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('No autorizado');
  assertNotViewer(session.user.role, 'registrar pagos');

  const db = getTenantPrisma(session.user.tenantId, session.user.id);
  const transaction = await RegisterInvoicePaymentInCashUseCase.execute(
    invoiceId,
    amount,
    session.user.tenantId,
    session.user.id,
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
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error('No autorizado');

  const result = await GenerateCashCutUseCase.execute({
    cashRegisterId,
    cutType,
    physicalCashReported,
    tenantId: session.user.tenantId,
    userId: session.user.id,
  });

  revalidatePath('/dashboard/cash-register');
  return result;
}
