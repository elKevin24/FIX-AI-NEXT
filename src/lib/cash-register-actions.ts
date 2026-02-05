'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@/generated/prisma';

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
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Verificar que no hay otra caja abierta con el mismo nombre
  const existingOpen = await db.cashRegister.findFirst({
    where: {
      tenantId: session.user.tenantId,
      name: data.name,
      isOpen: true,
    },
  });

  if (existingOpen) {
    throw new Error(
      `Ya existe una caja abierta con el nombre "${data.name}". Cierra la anterior primero.`
    );
  }

  const cashRegister = await db.cashRegister.create({
    data: {
      name: data.name,
      isOpen: true,
      openedAt: new Date(),
      openingBalance: new Prisma.Decimal(data.openingBalance),
      tenantId: session.user.tenantId,
      openedById: session.user.id,
    },
  });

  revalidatePath('/dashboard/cash-register');

  return cashRegister;
}

/**
 * Obtiene la caja abierta actualmente
 */
export async function getOpenCashRegister() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return null;
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const cashRegister = await db.cashRegister.findFirst({
    where: {
      tenantId: session.user.tenantId,
      isOpen: true,
    },
    include: {
      transactions: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      openedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return cashRegister;
}

/**
 * Obtiene todas las cajas (historial)
 */
export async function getCashRegisters(filters?: { from?: Date; to?: Date }) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return [];
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const where: any = {
    tenantId: session.user.tenantId,
  };

  if (filters?.from || filters?.to) {
    where.openedAt = {};
    if (filters.from) {
      where.openedAt.gte = filters.from;
    }
    if (filters.to) {
      where.openedAt.lte = filters.to;
    }
  }

  const cashRegisters = await db.cashRegister.findMany({
    where,
    include: {
      openedBy: {
        select: {
          name: true,
          email: true,
        },
      },
      closedBy: {
        select: {
          name: true,
          email: true,
        },
      },
      transactions: {
        select: {
          type: true,
          amount: true,
        },
      },
    },
    orderBy: {
      openedAt: 'desc',
    },
  });

  return cashRegisters;
}

/**
 * Registra una transacción de caja
 */
export async function registerCashTransaction(data: CashTransactionData) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Verificar que la caja existe y está abierta
  const cashRegister = await db.cashRegister.findUnique({
    where: { id: data.cashRegisterId },
  });

  if (!cashRegister || cashRegister.tenantId !== session.user.tenantId) {
    throw new Error('Caja registradora no encontrada');
  }

  if (!cashRegister.isOpen) {
    throw new Error('La caja registradora está cerrada');
  }

  const transaction = await db.cashTransaction.create({
    data: {
      type: data.type,
      amount: new Prisma.Decimal(data.amount),
      description: data.description,
      reference: data.reference,
      cashRegisterId: data.cashRegisterId,
      tenantId: session.user.tenantId,
      createdById: session.user.id,
    },
  });

  revalidatePath('/dashboard/cash-register');

  return transaction;
}

/**
 * Cierra una caja registradora
 */
export async function closeCashRegister(data: CloseCashRegisterData) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Obtener caja con transacciones
  const cashRegister = await db.cashRegister.findUnique({
    where: { id: data.cashRegisterId },
    include: {
      transactions: true,
    },
  });

  if (!cashRegister || cashRegister.tenantId !== session.user.tenantId) {
    throw new Error('Caja registradora no encontrada');
  }

  if (!cashRegister.isOpen) {
    throw new Error('Esta caja ya está cerrada');
  }

  // Calcular saldo esperado
  const openingBalance = Number(cashRegister.openingBalance);

  const totalIncome = cashRegister.transactions
    .filter((t: any) => t.type === 'INCOME')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const totalExpenses = cashRegister.transactions
    .filter((t: any) => t.type === 'EXPENSE' || t.type === 'WITHDRAWAL')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const expectedBalance = openingBalance + totalIncome - totalExpenses;
  const difference = data.closingBalance - expectedBalance;

  // Cerrar caja
  const updated = await db.cashRegister.update({
    where: { id: data.cashRegisterId },
    data: {
      isOpen: false,
      closedAt: new Date(),
      closingBalance: new Prisma.Decimal(data.closingBalance),
      expectedBalance: new Prisma.Decimal(expectedBalance),
      difference: new Prisma.Decimal(difference),
      closingNotes: data.notes,
      closedById: session.user.id,
    },
    include: {
      transactions: {
        orderBy: {
          createdAt: 'asc',
        },
      },
      openedBy: {
        select: {
          name: true,
          email: true,
        },
      },
      closedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  revalidatePath('/dashboard/cash-register');

  return updated;
}

/**
 * Obtiene estadísticas de caja
 */
export async function getCashRegisterStats(cashRegisterId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return null;
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const cashRegister = await db.cashRegister.findFirst({
    where: {
      id: cashRegisterId,
      tenantId: session.user.tenantId,
    },
    include: {
      transactions: true,
    },
  });

  if (!cashRegister) {
    return null;
  }

  const totalIncome = cashRegister.transactions
    .filter((t: any) => t.type === 'INCOME')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const totalExpenses = cashRegister.transactions
    .filter((t: any) => t.type === 'EXPENSE')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const totalWithdrawals = cashRegister.transactions
    .filter((t: any) => t.type === 'WITHDRAWAL')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const currentBalance = cashRegister.isOpen
    ? Number(cashRegister.openingBalance) + totalIncome - totalExpenses - totalWithdrawals
    : Number(cashRegister.closingBalance);

  return {
    openingBalance: Number(cashRegister.openingBalance),
    totalIncome,
    totalExpenses,
    totalWithdrawals,
    currentBalance,
    expectedBalance: cashRegister.isOpen
      ? Number(cashRegister.openingBalance) + totalIncome - totalExpenses - totalWithdrawals
      : Number(cashRegister.expectedBalance),
    difference: cashRegister.isOpen ? 0 : Number(cashRegister.difference),
    transactionCount: cashRegister.transactions.length,
  };
}

/**
 * Registra un ingreso de efectivo desde un pago de factura
 */
export async function registerInvoicePaymentInCash(
  invoiceId: string,
  amount: number
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Obtener caja abierta
  const cashRegister = await db.cashRegister.findFirst({
    where: {
      tenantId: session.user.tenantId,
      isOpen: true,
    },
  });

  if (!cashRegister) {
    throw new Error(
      'No hay caja abierta. Abre una caja antes de registrar pagos en efectivo.'
    );
  }

  // Obtener información de la factura
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      ticket: true,
      customer: true,
    },
  });

  if (!invoice) {
    throw new Error('Factura no encontrada');
  }

  // Registrar transacción de ingreso
  const transaction = await db.cashTransaction.create({
    data: {
      type: 'INCOME',
      amount: new Prisma.Decimal(amount),
      description: `Pago de factura ${invoice.invoiceNumber} - ${invoice.customer.name}`,
      reference: `Factura: ${invoice.invoiceNumber}, Ticket: ${invoice.ticket.ticketNumber}`,
      cashRegisterId: cashRegister.id,
      tenantId: session.user.tenantId,
      createdById: session.user.id,
    },
  });

  revalidatePath('/dashboard/cash-register');

  return transaction;
}
