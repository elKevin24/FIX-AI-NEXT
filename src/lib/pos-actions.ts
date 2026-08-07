'use server';

import { requireTenantSession, assertNotViewer } from '@/lib/auth-context';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PaymentMethod, POSSaleStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { getTaxRate } from './tenant-settings-actions';
import { CreatePOSSaleSchema } from '@/lib/schemas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface POSCartItem {
  partId: string;
  quantity: number;
}

interface POSPaymentItem {
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
}

interface CreatePOSSaleData {
  items: POSCartItem[];
  payments: POSPaymentItem[];
  customerId?: string;
  customerName?: string;
  customerNIT?: string;
  discountAmount?: number;
  notes?: string;
}

interface POSSaleFilters {
  status?: POSSaleStatus;
  customerId?: string;
  from?: Date;
  to?: Date;
  search?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safely converts a Prisma Decimal to a plain JS number. */
function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

/** Normalises Decimal fields on a sale row into plain numbers for API responses. */
function normalizeSaleDecimals<
  T extends {
    subtotal: Prisma.Decimal;
    taxRate: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    total: Prisma.Decimal;
    amountPaid: Prisma.Decimal;
    changeGiven: Prisma.Decimal;
  },
>(sale: T) {
  return {
    ...sale,
    subtotal: decimalToNumber(sale.subtotal),
    taxRate: decimalToNumber(sale.taxRate),
    taxAmount: decimalToNumber(sale.taxAmount),
    discountAmount: decimalToNumber(sale.discountAmount),
    total: decimalToNumber(sale.total),
    amountPaid: decimalToNumber(sale.amountPaid),
    changeGiven: decimalToNumber(sale.changeGiven),
  };
}

/** Fetches and validates the open cash register when cash payments are present. */
async function requireOpenCashRegister(
  db: ReturnType<typeof getTenantPrisma>,
  tenantId: string,
  hasCashPayment: boolean,
) {
  if (!hasCashPayment) return null;

  const register = await db.cashRegister.findFirst({
    where: { tenantId, isOpen: true },
  });

  if (!register) {
    throw new Error('No hay una caja abierta. Abra una caja para recibir pagos en efectivo.');
  }

  return register;
}

// ---------------------------------------------------------------------------
// Validated sale items builder
// ---------------------------------------------------------------------------

interface SaleLineItem {
  partId: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface SaleTotals {
  saleItems: SaleLineItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

/**
 * Resolves parts from DB, validates stock for each cart item, and computes
 * all monetary totals. Throws descriptive errors on missing parts or low stock.
 */
async function buildValidatedSaleTotals(
  db: ReturnType<typeof getTenantPrisma>,
  cartItems: POSCartItem[],
  discount: number,
  taxRate: number,
): Promise<SaleTotals> {
  const partIds = cartItems.map((item) => item.partId);
  const parts = await db.part.findMany({
    where: { id: { in: partIds } },
  });

  if (parts.length !== partIds.length) {
    throw new Error('Uno o más productos no fueron encontrados');
  }

  const saleItems: SaleLineItem[] = [];
  let subtotal = 0;

  for (const cartItem of cartItems) {
    const part = parts.find((p: (typeof parts)[number]) => p.id === cartItem.partId);
    if (!part) {
      throw new Error(`Producto ${cartItem.partId} no encontrado`);
    }
    if (part.quantity < cartItem.quantity) {
      throw new Error(`Stock insuficiente para "${part.name}". Disponible: ${part.quantity}`);
    }

    const unitPrice = decimalToNumber(part.price);
    const lineTotal = unitPrice * cartItem.quantity;
    subtotal += lineTotal;

    saleItems.push({ partId: part.id, partName: part.name, quantity: cartItem.quantity, unitPrice, total: lineTotal });
  }

  const discountAmount = discount;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const total = taxableAmount + taxAmount;

  return { saleItems, subtotal, discountAmount, taxableAmount, taxAmount, total };
}

// ---------------------------------------------------------------------------
// Payment helpers
// ---------------------------------------------------------------------------

/** Validates that payments cover the sale total; returns the change to give. */
function assertPaymentsCoverTotal(totalPayments: number, saleTotal: number): number {
  if (totalPayments < saleTotal) {
    throw new Error(
      `El total de pagos (Q${totalPayments.toFixed(2)}) es menor al total (Q${saleTotal.toFixed(2)})`,
    );
  }
  return totalPayments - saleTotal;
}

/** Revalidates the POS dashboard paths after a sale mutation. */
function revalidatePOSPaths() {
  revalidatePath('/dashboard/pos');
  revalidatePath('/dashboard/pos/history');
  revalidatePath('/dashboard/parts');
}

// ---------------------------------------------------------------------------
// Sale persistence helpers
// ---------------------------------------------------------------------------

type ValidatedPOSSaleData = z.infer<typeof CreatePOSSaleSchema>;

interface CreateSaleRecordArgs {
  data: ValidatedPOSSaleData;
  saleTotals: SaleTotals;
  taxRate: number;
  totalPayments: number;
  changeGiven: number;
  cashRegisterId: string | null;
  tenantId: string;
  userId: string;
}

/** Creates the sale header row. Sale number is assigned by the DB trigger. */
async function createSaleRecord(tx: Prisma.TransactionClient, args: CreateSaleRecordArgs) {
  const { data, saleTotals, taxRate, totalPayments, changeGiven, cashRegisterId, tenantId, userId } = args;

  return tx.pOSSale.create({
    data: {
      saleNumber: '', // Assigned by DB trigger trg_assign_sale_number
      customerId: data.customerId || null,
      customerName: data.customerName || 'Consumidor Final',
      subtotal: new Prisma.Decimal(saleTotals.subtotal),
      taxRate: new Prisma.Decimal(taxRate),
      taxAmount: new Prisma.Decimal(saleTotals.taxAmount),
      discountAmount: new Prisma.Decimal(saleTotals.discountAmount),
      total: new Prisma.Decimal(saleTotals.total),
      amountPaid: new Prisma.Decimal(totalPayments),
      changeGiven: new Prisma.Decimal(changeGiven),
      status: POSSaleStatus.COMPLETED,
      notes: data.notes,
      tenantId,
      cashRegisterId: cashRegisterId ?? null,
      createdById: userId,
    },
  });
}

/** Persists each cart line as a POSSaleItem. Stock is decremented by DB trigger. */
async function createSaleItems(tx: Prisma.TransactionClient, saleId: string, saleItems: SaleLineItem[]) {
  for (const item of saleItems) {
    await tx.pOSSaleItem.create({
      data: {
        saleId,
        partId: item.partId,
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(item.unitPrice),
        // Stock decrement handled by DB trigger trg_update_stock_on_pos_item
      },
    });
  }
}

/** Persists payments, recording cash movements when a register is open. */
async function createSalePayments(
  tx: Prisma.TransactionClient,
  args: {
    saleId: string;
    saleNumber: string;
    payments: ValidatedPOSSaleData['payments'];
    openCashRegister: { id: string } | null;
    tenantId: string;
    userId: string;
  },
) {
  const { saleId, saleNumber, payments, openCashRegister, tenantId, userId } = args;

  for (const payment of payments) {
    await tx.pOSSalePayment.create({
      data: {
        saleId,
        amount: new Prisma.Decimal(payment.amount),
        method: payment.paymentMethod, // Prisma schema field is 'method'
        reference: payment.transactionRef,
      },
    });

    if (payment.paymentMethod === PaymentMethod.CASH && openCashRegister) {
      await tx.cashTransaction.create({
        data: {
          type: 'INCOME',
          amount: new Prisma.Decimal(payment.amount),
          description: `Venta POS ${saleNumber}`,
          reference: saleId,
          cashRegisterId: openCashRegister.id,
          tenantId,
          createdById: userId,
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------

/**
 * Returns parts with available stock for the POS product picker.
 */
export async function getPartsForPOS(search?: string) {
  const { db } = await requireTenantSession();

  const where: Record<string, unknown> = { quantity: { gt: 0 } };

  if (search?.trim()) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }

  const parts = await db.part.findMany({
    where,
    select: { id: true, name: true, sku: true, quantity: true, price: true, category: true },
    orderBy: { name: 'asc' },
  });

  return parts.map((part: (typeof parts)[number]) => ({ ...part, price: decimalToNumber(part.price) }));
}

/**
 * Creates a POS sale with atomically validated stock and mixed-payment support.
 */
export async function createPOSSale(rawData: CreatePOSSaleData) {
  const { tenantId, userId, userRole, db } = await requireTenantSession();
  await assertNotViewer(userRole, 'realizar ventas');

  const validatedFields = CreatePOSSaleSchema.safeParse(rawData);
  if (!validatedFields.success) {
    throw new Error(`Datos inválidos: ${validatedFields.error.errors[0].message}`);
  }
  const data = validatedFields.data;

  const taxRate = await getTaxRate();
  const saleTotals = await buildValidatedSaleTotals(db, data.items, data.discountAmount ?? 0, taxRate);

  const totalPayments = data.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const changeGiven = assertPaymentsCoverTotal(totalPayments, saleTotals.total);

  const hasCashPayment = data.payments.some((p) => p.paymentMethod === PaymentMethod.CASH);
  const openCashRegister = await requireOpenCashRegister(db, tenantId, hasCashPayment);

  const sale = await db.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const newSale = await createSaleRecord(tx, {
        data,
        saleTotals,
        taxRate,
        totalPayments,
        changeGiven,
        cashRegisterId: openCashRegister?.id ?? null,
        tenantId,
        userId,
      });

      await createSaleItems(tx, newSale.id, saleTotals.saleItems);
      await createSalePayments(tx, {
        saleId: newSale.id,
        saleNumber: newSale.saleNumber,
        payments: data.payments,
        openCashRegister,
        tenantId,
        userId,
      });

      return newSale;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
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

  if (!reason?.trim()) {
    throw new Error('Debe proporcionar una razón para anular la venta');
  }

  const sale = await db.pOSSale.findFirst({
    where: { id: saleId, tenantId },
    include: { items: true, payments: true, creditNotes: true },
  });

  if (!sale) throw new Error('Venta no encontrada');
  if (sale.status !== POSSaleStatus.COMPLETED) throw new Error('Solo se pueden anular ventas completadas');
  if (sale.creditNotes.length > 0) {
    throw new Error('Esta venta tiene notas de crédito asociadas. Use el proceso de devolución.');
  }

  const cashPayments = sale.payments.filter(
    (p: (typeof sale.payments)[number]) => p.paymentMethod === PaymentMethod.CASH,
  );
  const openCashRegister = await requireOpenCashRegister(db, tenantId, cashPayments.length > 0);

  await db.$transaction(
    async (tx: Prisma.TransactionClient) => {
      await tx.pOSSale.update({
        where: { id: saleId },
        data: {
          status: POSSaleStatus.VOIDED,
          notes: sale.notes ? `${sale.notes}\n\nANULADA: ${reason}` : `ANULADA: ${reason}`,
        },
      });
      // Stock restore handled by DB trigger trg_restore_stock_on_void

      if (openCashRegister) {
        const totalCashRefund = cashPayments.reduce(
          (sum: number, payment: (typeof cashPayments)[number]) => sum + decimalToNumber(payment.amount),
          0,
        );

        if (totalCashRefund > 0) {
          await tx.cashTransaction.create({
            data: {
              type: 'EXPENSE',
              amount: new Prisma.Decimal(totalCashRefund),
              description: `Anulación venta ${sale.saleNumber}: ${reason}`,
              reference: saleId,
              cashRegisterId: openCashRegister.id,
              tenantId,
              createdById: userId,
            },
          });
        }
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  revalidatePOSPaths();

  return { success: true };
}

/**
 * Returns POS sales with optional filters applied.
 */
export async function getPOSSales(filters?: POSSaleFilters) {
  const { tenantId, db } = await requireTenantSession();

  const where: Record<string, unknown> = { tenantId };

  if (filters?.status) where.status = filters.status;
  if (filters?.customerId) where.customerId = filters.customerId;

  if (filters?.from || filters?.to) {
    const dateRange: Record<string, unknown> = {};
    if (filters.from) dateRange.gte = filters.from;
    if (filters.to) dateRange.lte = filters.to;
    where.createdAt = dateRange;
  }

  if (filters?.search) {
    where.OR = [
      { saleNumber: { contains: filters.search, mode: 'insensitive' } },
      { customerName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const sales = await db.pOSSale.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true } },
      items: { select: { id: true, partName: true, quantity: true, unitPrice: true, total: true } },
      payments: { select: { paymentMethod: true, amount: true } },
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return sales.map((sale: (typeof sales)[number]) => ({
    ...normalizeSaleDecimals(sale),
    items: sale.items.map((item: (typeof sale.items)[number]) => ({
      ...item,
      unitPrice: decimalToNumber(item.unitPrice),
      total: decimalToNumber(item.total),
    })),
    payments: sale.payments.map((payment: (typeof sale.payments)[number]) => ({
      ...payment,
      amount: decimalToNumber(payment.amount),
    })),
  }));
}

/**
 * Returns customers for the POS customer selector (max 20 results).
 */
export async function getCustomersForPOS(search?: string) {
  const { tenantId, db } = await requireTenantSession();

  const where: Record<string, unknown> = { tenantId };

  if (search?.trim()) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { nit: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  return db.customer.findMany({
    where,
    select: { id: true, name: true, nit: true, phone: true },
    orderBy: { name: 'asc' },
    take: 20,
  });
}

/**
 * Returns aggregated POS sales statistics for a time range.
 */
export async function getPOSSalesStats(from?: Date, to?: Date) {
  const { tenantId, db } = await requireTenantSession();

  const where: Record<string, unknown> = { tenantId, status: POSSaleStatus.COMPLETED };

  if (from || to) {
    const dateRange: Record<string, unknown> = {};
    if (from) dateRange.gte = from;
    if (to) dateRange.lte = to;
    where.createdAt = dateRange;
  }

  const [stats, payments] = await Promise.all([
    db.pOSSale.aggregate({
      _sum: { total: true, taxAmount: true, discountAmount: true },
      _count: { id: true },
      where,
    }),
    db.pOSSalePayment.findMany({
      where: { sale: where },
      select: { method: true, amount: true },
    }),
  ]);

  const byPaymentMethod = payments.reduce(
    (acc: Record<string, number>, payment: (typeof payments)[number]) => {
      if (!payment.method) return acc;
      acc[payment.method] = (acc[payment.method] ?? 0) + decimalToNumber(payment.amount);
      return acc;
    },
    {},
  );

  return {
    salesCount: stats._count.id,
    totalSales: decimalToNumber(stats._sum.total),
    totalTax: decimalToNumber(stats._sum.taxAmount),
    totalDiscount: decimalToNumber(stats._sum.discountAmount),
    byPaymentMethod,
  };
}
