import { Prisma } from '@prisma/client';
import { getTenantPrisma } from '@/lib/tenant-prisma';

type TenantDb = ReturnType<typeof getTenantPrisma>;

export interface OpenRegisterParams {
  name: string;
  openingBalance: number;
}

export interface RegisterTransactionParams {
  cashRegisterId: string;
  type: 'INCOME' | 'EXPENSE' | 'WITHDRAWAL';
  amount: number;
  description: string;
  reference?: string | null;
}

export interface CloseRegisterParams {
  cashRegisterId: string;
  closingBalance: number;
  notes?: string | null;
}

export class OpenCashRegisterActionUseCase {
  static async execute(
    data: OpenRegisterParams,
    tenantId: string,
    userId: string,
    db: TenantDb
  ) {
    const existingOpen = await db.cashRegister.findFirst({
      where: {
        tenantId,
        name: data.name,
        isOpen: true,
      },
    });

    if (existingOpen) {
      throw new Error(
        `Ya existe una caja abierta con el nombre "${data.name}". Cierra la anterior primero.`
      );
    }

    return await db.cashRegister.create({
      data: {
        name: data.name,
        isOpen: true,
        openedAt: new Date(),
        openingBalance: new Prisma.Decimal(data.openingBalance),
        tenantId,
        openedById: userId,
      },
    });
  }
}

export class GetOpenCashRegisterUseCase {
  static async execute(tenantId: string, db: TenantDb) {
    return await db.cashRegister.findFirst({
      where: {
        tenantId,
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
  }
}

export class GetCashRegistersUseCase {
  static async execute(
    filters: { from?: Date; to?: Date } | undefined,
    tenantId: string,
    db: TenantDb
  ) {
    const where: any = { tenantId };

    if (filters?.from || filters?.to) {
      where.openedAt = {};
      if (filters.from) where.openedAt.gte = filters.from;
      if (filters.to) where.openedAt.lte = filters.to;
    }

    return await db.cashRegister.findMany({
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
  }
}

export class RegisterCashTransactionUseCase {
  static async execute(
    data: RegisterTransactionParams,
    tenantId: string,
    userId: string,
    db: TenantDb
  ) {
    const cashRegister = await db.cashRegister.findUnique({
      where: { id: data.cashRegisterId },
    });

    if (!cashRegister || cashRegister.tenantId !== tenantId) {
      throw new Error('Caja registradora no encontrada');
    }

    if (!cashRegister.isOpen) {
      throw new Error('La caja registradora está cerrada');
    }

    return await db.cashTransaction.create({
      data: {
        type: data.type,
        amount: new Prisma.Decimal(data.amount),
        description: data.description,
        reference: data.reference,
        cashRegisterId: data.cashRegisterId,
        tenantId,
        createdById: userId,
      },
    });
  }
}

export class CloseCashRegisterActionUseCase {
  static async execute(
    data: CloseRegisterParams,
    tenantId: string,
    userId: string,
    db: TenantDb
  ) {
    const cashRegister = await db.cashRegister.findUnique({
      where: { id: data.cashRegisterId },
      include: {
        transactions: true,
      },
    });

    if (!cashRegister || cashRegister.tenantId !== tenantId) {
      throw new Error('Caja registradora no encontrada');
    }

    if (!cashRegister.isOpen) {
      throw new Error('Esta caja ya está cerrada');
    }

    const openingBalance = Number(cashRegister.openingBalance);

    const totalIncome = cashRegister.transactions
      .filter((t: any) => t.type === 'INCOME')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    const totalExpenses = cashRegister.transactions
      .filter((t: any) => t.type === 'EXPENSE' || t.type === 'WITHDRAWAL')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    const expectedBalance = openingBalance + totalIncome - totalExpenses;
    const difference = data.closingBalance - expectedBalance;

    return await db.cashRegister.update({
      where: { id: data.cashRegisterId },
      data: {
        isOpen: false,
        closedAt: new Date(),
        closingBalance: new Prisma.Decimal(data.closingBalance),
        expectedBalance: new Prisma.Decimal(expectedBalance),
        difference: new Prisma.Decimal(difference),
        closingNotes: data.notes,
        closedById: userId,
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
  }
}

export class GetCashRegisterStatsUseCase {
  static async execute(cashRegisterId: string, tenantId: string, db: TenantDb) {
    const cashRegister = await db.cashRegister.findFirst({
      where: {
        id: cashRegisterId,
        tenantId,
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
}

export class RegisterInvoicePaymentInCashUseCase {
  static async execute(invoiceId: string, amount: number, tenantId: string, userId: string, db: TenantDb) {
    const cashRegister = await db.cashRegister.findFirst({
      where: {
        tenantId,
        isOpen: true,
      },
    });

    if (!cashRegister) {
      throw new Error(
        'No hay caja abierta. Abre una caja antes de registrar pagos en efectivo.'
      );
    }

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

    return await db.cashTransaction.create({
      data: {
        type: 'INCOME',
        amount: new Prisma.Decimal(amount),
        description: `Pago de factura ${invoice.invoiceNumber} - ${invoice.customer.name}`,
        reference: `Factura: ${invoice.invoiceNumber}, Ticket: ${invoice.ticket.ticketNumber}`,
        cashRegisterId: cashRegister.id,
        tenantId,
        createdById: userId,
      },
    });
  }
}
