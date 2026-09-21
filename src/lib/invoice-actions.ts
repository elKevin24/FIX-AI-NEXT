'use server';

/**
 * Invoice Server Actions (Thin Controller)
 * Delegating domain operations to BillingUseCases.
 */

import { requireTenantSession, assertNotViewer } from '@/lib/auth-context';
import { revalidatePath } from 'next/cache';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';
import { getTaxRate } from './tenant-settings-actions';
import { GenerateInvoiceSchema, RegisterPaymentSchema } from '@/lib/schemas';
import {
  GenerateInvoiceFromTicketUseCase,
  GetInvoicesUseCase,
  GetInvoiceByIdUseCase,
  RegisterInvoicePaymentUseCase,
  CancelInvoiceActionUseCase,
  GetFinancialStatsUseCase,
} from '@/use-cases/invoices';

// ============================================================================
// TYPES
// ============================================================================

export interface InvoiceData {
  ticketId: string;
  taxRate?: number; // Default: 12% (IVA Guatemala)
  discountAmount?: number;
  notes?: string;
  paymentTerms?: string;
}

export interface PaymentData {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  notes?: string;
}

// ============================================================================
// INVOICE GENERATION
// ============================================================================

/**
 * Genera una factura automática para un ticket cerrado
 * Calcula automáticamente los costos de partes y mano de obra
 */
export async function generateInvoiceFromTicket(rawData: InvoiceData) {
  const { tenantId, userId, userRole, db } = await requireTenantSession();
  await assertNotViewer(userRole, 'generar facturas');

  const validatedFields = GenerateInvoiceSchema.safeParse(rawData);
  if (!validatedFields.success) {
    throw new Error(`Datos inválidos: ${validatedFields.error.errors[0]?.message ?? 'Datos inválidos'}`);
  }

  const defaultTaxRate = await getTaxRate();
  const invoice = await GenerateInvoiceFromTicketUseCase.execute(
    validatedFields.data,
    defaultTaxRate,
    tenantId,
    userId,
    db
  );

  revalidatePath('/dashboard/invoices');
  revalidatePath(`/dashboard/tickets/${invoice.ticketId}`);

  return invoice;
}

/**
 * Obtiene todas las facturas del tenant
 */
export async function getInvoices(filters?: {
  status?: InvoiceStatus;
  customerId?: string;
  from?: Date;
  to?: Date;
}) {
  const { tenantId, db } = await requireTenantSession();
  return await GetInvoicesUseCase.execute(filters, tenantId, db);
}

/**
 * Obtiene una factura por ID
 */
export async function getInvoiceById(id: string) {
  const { tenantId, db } = await requireTenantSession();
  return await GetInvoiceByIdUseCase.execute(id, tenantId, db);
}

// ============================================================================
// PAYMENT REGISTRATION
// ============================================================================

/**
 * Registra un pago para una factura
 */
export async function registerPayment(rawData: PaymentData) {
  const { tenantId, userId, userRole, db } = await requireTenantSession();
  await assertNotViewer(userRole, 'registrar pagos');

  const validatedFields = RegisterPaymentSchema.safeParse(rawData);
  if (!validatedFields.success) {
    throw new Error(`Datos inválidos: ${validatedFields.error.errors[0]?.message ?? 'Datos inválidos'}`);
  }

  const result = await RegisterInvoicePaymentUseCase.execute(
    validatedFields.data,
    tenantId,
    userId,
    db
  );

  revalidatePath('/dashboard/invoices');
  revalidatePath(`/dashboard/invoices/${result.invoice.id}`);

  return result;
}

/**
 * Cancela una factura (solo si no tiene pagos)
 */
export async function cancelInvoice(invoiceId: string, reason: string) {
  const { tenantId, userId, userRole, db } = await requireTenantSession();
  await assertNotViewer(userRole, 'cancelar facturas');

  const updated = await CancelInvoiceActionUseCase.execute(
    invoiceId,
    reason,
    tenantId,
    userId,
    db
  );

  revalidatePath('/dashboard/invoices');
  revalidatePath(`/dashboard/invoices/${invoiceId}`);

  return updated;
}

// ============================================================================
// FINANCIAL REPORTS
// ============================================================================

/**
 * Obtiene estadísticas financieras del tenant
 */
export async function getFinancialStats(filters?: { from?: Date; to?: Date }) {
  const { tenantId, db } = await requireTenantSession();
  return await GetFinancialStatsUseCase.execute(filters, tenantId, db);
}
