'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
import { PaymentMethod, POSSaleStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getTaxRate } from './tenant-settings-actions';

// ============================================================================
// TYPES
// ============================================================================

export interface POSCartItem {
  partId: string;
  quantity: number;
}

export interface POSPaymentItem {
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
}

export interface CreatePOSSaleData {
  items: POSCartItem[];
  payments: POSPaymentItem[];
  customerId?: string;
  customerName?: string;
  customerNIT?: string;
  discountAmount?: number;
  notes?: string;
}

export interface POSSaleFilters {
  status?: POSSaleStatus;
  customerId?: string;
  from?: Date;
  to?: Date;
  search?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function decimalToNumber(value: Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

// ============================================================================
// POS SALE ACTIONS
// ============================================================================

/**
 * Get parts available for POS (with stock > 0)
 */
export async function getPartsForPOS(search?: string) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return [];
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
    quantity: { gt: 0 },
  };

  if (search && search.trim()) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }

  const parts = await db.part.findMany({
    where,
    select: {
      id: true,
      name: true,
      sku: true,
      quantity: true,
      price: true,
      category: true,
    },
    orderBy: { name: 'asc' },
  });

  return parts.map((part: any) => ({
    ...part,
    price: decimalToNumber(part.price),
  }));
}

/**
 * Create a POS sale with mixed payments support
 */
export async function createPOSSale(data: CreatePOSSaleData) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  if (!data.items || data.items.length === 0) {
    throw new Error('Debe agregar al menos un producto');
  }

  if (!data.payments || data.payments.length === 0) {
    throw new Error('Debe agregar al menos un método de pago');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Get tax rate from tenant settings
  const taxRate = await getTaxRate();

  // Verify stock and calculate totals
  const partIds = data.items.map(item => item.partId);
  const parts = await db.part.findMany({
    where: {
      id: { in: partIds },
      tenantId: session.user.tenantId,
    },
  });

  if (parts.length !== partIds.length) {
    throw new Error('Uno o más productos no fueron encontrados');
  }

  // Build items with validation
  const saleItems: Array<{
    partId: string;
    partName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }> = [];

  let subtotal = 0;

  for (const item of data.items) {
    const part = parts.find((p: any) => p.id === item.partId);
    if (!part) {
      throw new Error(`Producto ${item.partId} no encontrado`);
    }

    if (part.quantity < item.quantity) {
      throw new Error(`Stock insuficiente para "${part.name}". Disponible: ${part.quantity}`);
    }

    const unitPrice = decimalToNumber(part.price);
    const total = unitPrice * item.quantity;
    subtotal += total;

    saleItems.push({
      partId: part.id,
      partName: part.name,
      quantity: item.quantity,
      unitPrice,
      total,
    });
  }

  // Calculate totals
  const discountAmount = data.discountAmount ?? 0;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const total = taxableAmount + taxAmount;

  // Validate payments cover total
  const totalPayments = data.payments.reduce((sum, p) => sum + p.amount, 0);
  if (totalPayments < total) {
    throw new Error(`El total de pagos (Q${totalPayments.toFixed(2)}) es menor al total (Q${total.toFixed(2)})`);
  }

  // Calculate change
  const changeGiven = totalPayments - total;

  // Check if there's an open cash register (required for cash payments)
  const hasCashPayment = data.payments.some(p => p.paymentMethod === PaymentMethod.CASH);
  let openCashRegister = null;

  if (hasCashPayment) {
    openCashRegister = await db.cashRegister.findFirst({
      where: {
        tenantId: session.user.tenantId,
        isOpen: true,
      },
    });

    if (!openCashRegister) {
      throw new Error('No hay una caja abierta. Abra una caja para recibir pagos en efectivo.');
    }
  }

  // Create sale in transaction
  const sale = await db.$transaction(async (tx: typeof db) => {
    // 1. Create the sale
    const newSale = await tx.pOSSale.create({
      data: {
        saleNumber: '', // Handled by DB Trigger
        customerId: data.customerId || null,
        customerName: data.customerName || 'Consumidor Final',
        customerNIT: data.customerNIT || 'C/F',
        subtotal: new Decimal(subtotal),
        taxRate: new Decimal(taxRate),
        taxAmount: new Decimal(taxAmount),
        discountAmount: new Decimal(discountAmount),
        total: new Decimal(total),
        amountPaid: new Decimal(totalPayments),
        changeGiven: new Decimal(changeGiven),
        status: POSSaleStatus.COMPLETED,
        notes: data.notes,
        tenantId: session.user.tenantId,
        cashRegisterId: openCashRegister?.id || null,
        createdById: session.user.id,
      },
    });

    // 2. Create sale items
    for (const item of saleItems) {
      await tx.pOSSaleItem.create({
        data: {
          saleId: newSale.id,
          partId: item.partId,
          quantity: item.quantity,
          unitPrice: new Decimal(item.unitPrice),
        },
      });

      // 3. Decrement stock - HANDLED BY DB TRIGGER (trg_update_stock_on_pos_item)
      // await tx.part.update({
      //   where: { id: item.partId },
      //   data: {
      //     quantity: {
      //       decrement: item.quantity,
      //     },
      //   },
      // });
    }

    // 4. Create payments
    for (const payment of data.payments) {
      await tx.pOSSalePayment.create({
        data: {
          saleId: newSale.id,
          amount: new Decimal(payment.amount),
          paymentMethod: payment.paymentMethod,
          transactionRef: payment.transactionRef,
        },
      });

      // 5. If cash payment, register in cash register
      if (payment.paymentMethod === PaymentMethod.CASH && openCashRegister) {
        await tx.cashTransaction.create({
          data: {
            type: 'INCOME',
            amount: new Decimal(payment.amount),
            description: `Venta POS ${newSale.saleNumber}`,
            reference: newSale.id,
            cashRegisterId: openCashRegister.id,
            tenantId: session.user.tenantId,
            createdById: session.user.id,
          },
        });
      }
    }

    return newSale;
  });

  revalidatePath('/dashboard/pos');
  revalidatePath('/dashboard/pos/history');
  revalidatePath('/dashboard/parts');

  return sale;
}

/**
 * Void a POS sale (restore stock, register expense if cash)
 */
export async function voidPOSSale(saleId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  if (!reason || reason.trim().length === 0) {
    throw new Error('Debe proporcionar una razón para anular la venta');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Get sale with items and payments
  const sale = await db.pOSSale.findFirst({
    where: {
      id: saleId,
      tenantId: session.user.tenantId,
    },
    include: {
      items: true,
      payments: true,
      creditNotes: true,
    },
  });

  if (!sale) {
    throw new Error('Venta no encontrada');
  }

  if (sale.status !== POSSaleStatus.COMPLETED) {
    throw new Error('Solo se pueden anular ventas completadas');
  }

  if (sale.creditNotes.length > 0) {
    throw new Error('Esta venta tiene notas de crédito asociadas. Use el proceso de devolución.');
  }

  // Check for open cash register if there were cash payments
  const cashPayments = sale.payments.filter((p: any) => p.paymentMethod === PaymentMethod.CASH);
  let openCashRegister = null;

  if (cashPayments.length > 0) {
    openCashRegister = await db.cashRegister.findFirst({
      where: {
        tenantId: session.user.tenantId,
        isOpen: true,
      },
    });

    if (!openCashRegister) {
      throw new Error('No hay una caja abierta para registrar la devolución de efectivo');
    }
  }

  // Void in transaction
  await db.$transaction(async (tx: typeof db) => {
    // 1. Update sale status
    await tx.pOSSale.update({
      where: { id: saleId },
      data: {
        status: POSSaleStatus.VOIDED,
        notes: sale.notes
          ? `${sale.notes}\n\nANULADA: ${reason}`
          : `ANULADA: ${reason}`,
      },
    });

    // 2. Restore stock for each item - HANDLED BY DB TRIGGER (trg_restore_stock_on_void)
    /* 
    for (const item of sale.items) {
      await tx.part.update({
        where: { id: item.partId },
        data: {
          quantity: {
            increment: item.quantity,
          },
        },
      });
    }
    */

    // 3. Register expense for cash payments
    if (openCashRegister) {
      const totalCash = cashPayments.reduce(
        (sum: number, p: any) => sum + decimalToNumber(p.amount),
        0
      );

      if (totalCash > 0) {
        await tx.cashTransaction.create({
          data: {
            type: 'EXPENSE',
            amount: new Decimal(totalCash),
            description: `Anulación venta ${sale.saleNumber}: ${reason}`,
            reference: saleId,
            cashRegisterId: openCashRegister.id,
            tenantId: session.user.tenantId,
            createdById: session.user.id,
          },
        });
      }
    }
  });

  revalidatePath('/dashboard/pos');
  revalidatePath('/dashboard/pos/history');
  revalidatePath('/dashboard/parts');

  return { success: true };
}

/**
 * Get POS sales with filters
 */
export async function getPOSSales(filters?: POSSaleFilters) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return [];
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
  };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.customerId) {
    where.customerId = filters.customerId;
  }

  if (filters?.from || filters?.to) {
    where.createdAt = {};
    if (filters.from) {
      (where.createdAt as Record<string, unknown>).gte = filters.from;
    }
    if (filters.to) {
      (where.createdAt as Record<string, unknown>).lte = filters.to;
    }
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
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
      items: {
        select: {
          id: true,
          partName: true,
          quantity: true,
          unitPrice: true,
          total: true,
        },
      },
      payments: {
        select: {
          paymentMethod: true,
          amount: true,
        },
      },
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return sales.map((sale: any) => ({
    ...sale,
    subtotal: decimalToNumber(sale.subtotal),
    taxRate: decimalToNumber(sale.taxRate),
    taxAmount: decimalToNumber(sale.taxAmount),
    discountAmount: decimalToNumber(sale.discountAmount),
    total: decimalToNumber(sale.total),
    amountPaid: decimalToNumber(sale.amountPaid),
    changeGiven: decimalToNumber(sale.changeGiven),
    items: sale.items.map((item: any) => ({
      ...item,
      unitPrice: decimalToNumber(item.unitPrice),
      total: decimalToNumber(item.total),
    })),
    payments: sale.payments.map((p: any) => ({
      ...p,
      amount: decimalToNumber(p.amount),
    })),
  }));
}

/**
 * Get a single POS sale by ID
 */
export async function getPOSSaleById(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const sale = await db.pOSSale.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    include: {
      customer: true,
      items: {
        include: {
          part: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
        },
      },
      payments: true,
      creditNotes: {
        select: {
          id: true,
          creditNoteNumber: true,
          total: true,
          status: true,
          createdAt: true,
        },
      },
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!sale) {
    return null;
  }

  return {
    ...sale,
    subtotal: decimalToNumber(sale.subtotal),
    taxRate: decimalToNumber(sale.taxRate),
    taxAmount: decimalToNumber(sale.taxAmount),
    discountAmount: decimalToNumber(sale.discountAmount),
    total: decimalToNumber(sale.total),
    amountPaid: decimalToNumber(sale.amountPaid),
    changeGiven: decimalToNumber(sale.changeGiven),
    items: sale.items.map((item: any) => ({
      ...item,
      unitPrice: decimalToNumber(item.unitPrice),
      total: decimalToNumber(item.total),
    })),
    payments: sale.payments.map((p: any) => ({
      ...p,
      amount: decimalToNumber(p.amount),
    })),
    creditNotes: sale.creditNotes.map((cn: any) => ({
      ...cn,
      total: decimalToNumber(cn.total),
    })),
  };
}

/**
 * Get customers for POS selector
 */
export async function getCustomersForPOS(search?: string) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return [];
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
  };

  if (search && search.trim()) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { nit: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const customers = await db.customer.findMany({
    where,
    select: {
      id: true,
      name: true,
      nit: true,
      phone: true,
    },
    orderBy: { name: 'asc' },
    take: 20,
  });

  return customers;
}

/**
 * Get POS sales statistics
 */
export async function getPOSSalesStats(from?: Date, to?: Date) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return null;
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
    status: POSSaleStatus.COMPLETED,
  };

  if (from || to) {
    where.createdAt = {};
    if (from) {
      (where.createdAt as Record<string, unknown>).gte = from;
    }
    if (to) {
      (where.createdAt as Record<string, unknown>).lte = to;
    }
  }

  // 1. Main Aggregations (DB Side)
  const stats = await db.pOSSale.aggregate({
    _sum: {
      total: true,
      taxAmount: true,
      discountAmount: true,
    },
    _count: {
      id: true,
    },
    where,
  });

  // 2. Payment Method Aggregation (DB Side)
  // We query the payment table filtering by the parent sale criteria
  const paymentsByMethod = await db.pOSSalePayment.groupBy({
    by: ['paymentMethod'],
    _sum: {
      amount: true,
    },
    where: {
      sale: where,
    },
  });

  // Transform Data
  const byPaymentMethod: Record<string, number> = {};
  paymentsByMethod.forEach((p: any) => {
    if (p.paymentMethod) {
      byPaymentMethod[p.paymentMethod] = decimalToNumber(p._sum.amount);
    }
  });

  return {
    salesCount: stats._count.id,
    totalSales: decimalToNumber(stats._sum.total),
    totalTax: decimalToNumber(stats._sum.taxAmount),
    totalDiscount: decimalToNumber(stats._sum.discountAmount),
    byPaymentMethod,
  };
}
