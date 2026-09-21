import { InvoiceStatus, PaymentMethod, Prisma } from '@prisma/client';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { registerInvoicePaymentInCash } from '@/lib/cash-register-actions';

type TenantDb = ReturnType<typeof getTenantPrisma>;

export function computeNextSequentialNumber(lastNumber: string | null | undefined, prefix: string): string {
  const paddingLength = 4;
  if (!lastNumber) return `${prefix}-${'0001'}`;

  const parts = lastNumber.split('-');
  const sequenceDigits = parseInt(parts[parts.length - 1] || '0', 10);
  const next = isNaN(sequenceDigits) ? 1 : sequenceDigits + 1;

  return `${prefix}-${String(next).padStart(paddingLength, '0')}`;
}

export interface GenerateInvoiceParams {
  ticketId: string;
  taxRate?: number;
  discountAmount?: number;
  notes?: string | null;
  paymentTerms?: string | null;
}

export class GenerateInvoiceFromTicketUseCase {
  static async execute(
    data: GenerateInvoiceParams,
    defaultTaxRate: number,
    tenantId: string,
    userId: string,
    db: TenantDb
  ) {
    const ticket = await db.ticket.findUnique({
      where: { id: data.ticketId },
      include: {
        customer: true,
        partsUsed: {
          include: {
            part: true,
          },
        },
        serviceTemplate: true,
        services: true,
        invoice: true,
      },
    });

    if (!ticket) {
      throw new Error('Ticket no encontrado');
    }

    if (ticket.tenantId !== tenantId) {
      throw new Error('No autorizado');
    }

    if (ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED') {
      throw new Error('El ticket debe estar cerrado o resuelto para generar factura');
    }

    if (ticket.invoice) {
      throw new Error('Este ticket ya tiene una factura generada');
    }

    let laborCost = 0;
    if (ticket.services && ticket.services.length > 0) {
      laborCost = ticket.services.reduce((sum: number, service: any) => sum + Number(service.laborCost), 0);
    } else if (ticket.serviceTemplate?.laborCost) {
      laborCost = Number(ticket.serviceTemplate.laborCost);
    }

    let partsCost = 0;
    let partsMarkup = 0;

    for (const partUsage of ticket.partsUsed) {
      if (partUsage.approved === false) continue;

      const unitPrice = Number(partUsage.priceAtProposal ?? partUsage.part.price);
      const partPrice = unitPrice * partUsage.quantity;
      const partCost = Number(partUsage.part.cost) * partUsage.quantity;
      partsCost += partPrice;
      partsMarkup += (partPrice - partCost);
    }

    const subtotal = laborCost + partsCost;
    const taxRate = data.taxRate ?? defaultTaxRate;
    const taxAmount = (subtotal * taxRate) / 100;
    const discountAmount = data.discountAmount ?? 0;
    const total = subtotal + taxAmount - discountAmount;

    const lastInvoice = await db.invoice.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });

    const invoiceNumber = computeNextSequentialNumber(lastInvoice?.invoiceNumber, 'INV');

    return await db.invoice.create({
      data: {
        invoiceNumber,
        status: InvoiceStatus.PENDING,
        ticketId: ticket.id,
        customerId: ticket.customerId,

        laborCost: new Prisma.Decimal(laborCost),
        partsCost: new Prisma.Decimal(partsCost),
        partsMarkup: new Prisma.Decimal(partsMarkup),
        subtotal: new Prisma.Decimal(subtotal),
        taxRate: new Prisma.Decimal(taxRate),
        taxAmount: new Prisma.Decimal(taxAmount),
        discountAmount: new Prisma.Decimal(discountAmount),
        total: new Prisma.Decimal(total),

        customerName: ticket.customer.name,
        customerNIT: ticket.customer.nit || undefined,
        customerDPI: ticket.customer.dpi || undefined,
        customerAddress: ticket.customer.address || undefined,

        notes: data.notes,
        paymentTerms: data.paymentTerms || 'Pago al retirar equipo',

        tenantId,
        createdById: userId,
        updatedById: userId,
      },
      include: {
        customer: true,
        ticket: true,
        payments: true,
      },
    });
  }
}

export class GetInvoicesUseCase {
  static async execute(
    filters: {
      status?: InvoiceStatus;
      customerId?: string;
      from?: Date;
      to?: Date;
    } | undefined,
    tenantId: string,
    db: TenantDb
  ) {
    const where: Prisma.InvoiceWhereInput = { tenantId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.from || filters?.to) {
      where.issuedAt = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }

    const invoices: any[] = await db.invoice.findMany({
      where,
      include: {
        customer: true,
        ticket: {
          select: {
            ticketNumber: true,
            deviceType: true,
            deviceModel: true,
          },
        },
        payments: {
          select: {
            amount: true,
            paidAt: true,
            paymentMethod: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invoices.map((invoice) => ({
      ...invoice,
      laborCost: Number(invoice.laborCost),
      partsCost: Number(invoice.partsCost),
      partsMarkup: Number(invoice.partsMarkup),
      subtotal: Number(invoice.subtotal),
      taxRate: Number(invoice.taxRate),
      taxAmount: Number(invoice.taxAmount),
      discountAmount: Number(invoice.discountAmount),
      total: Number(invoice.total),
      payments: invoice.payments.map((payment: any) => ({
        ...payment,
        amount: Number(payment.amount),
      })),
    }));
  }
}

export class GetInvoiceByIdUseCase {
  static async execute(id: string, tenantId: string, db: TenantDb) {
    return await db.invoice.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        ticket: {
          include: {
            partsUsed: {
              include: {
                part: true,
              },
            },
          },
        },
        payments: {
          include: {
            receivedBy: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            paidAt: 'desc',
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
  }
}

export interface RegisterPaymentParams {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string | null;
  notes?: string | null;
}

export class RegisterInvoicePaymentUseCase {
  static async execute(
    data: RegisterPaymentParams,
    tenantId: string,
    userId: string,
    db: TenantDb
  ) {
    const invoice: any = await db.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { payments: true },
    });

    if (!invoice || invoice.tenantId !== tenantId) {
      throw new Error('Factura no encontrada');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new Error('Esta factura ya está pagada completamente');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('No se puede registrar pago en una factura cancelada');
    }

    const totalPaid = invoice.payments.reduce(
      (sum: number, payment: any) => sum + Number(payment.amount),
      0,
    );

    const remaining = Number(invoice.total) - totalPaid;

    if (data.amount > remaining) {
      throw new Error(
        `El monto excede el saldo pendiente (Q${remaining.toFixed(2)})`
      );
    }

    const lastPayment = await db.payment.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { paymentNumber: true },
    });

    const nextPaymentNumber = computeNextSequentialNumber(lastPayment?.paymentNumber, 'PAY');

    return await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const payment = await tx.payment.create({
        data: {
          paymentNumber: nextPaymentNumber,
          invoiceId: data.invoiceId,
          amount: new Prisma.Decimal(data.amount),
          paymentMethod: data.paymentMethod,
          transactionRef: data.transactionRef,
          notes: data.notes,
          tenantId,
          receivedById: userId,
        },
      });

      const newTotalPaid = totalPaid + data.amount;
      const isFullyPaid = newTotalPaid >= Number(invoice.total);

      const updatedInvoice = await tx.invoice.update({
        where: { id: data.invoiceId },
        data: {
          status: isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PENDING,
          paidAt: isFullyPaid ? new Date() : invoice.paidAt,
          updatedById: userId,
        },
        include: { payments: true, customer: true, ticket: true },
      });

      if (data.paymentMethod === PaymentMethod.CASH) {
        await registerInvoicePaymentInCash(data.invoiceId, data.amount);
      }

      return { payment, invoice: updatedInvoice };
    });
  }
}

export class CancelInvoiceActionUseCase {
  static async execute(invoiceId: string, reason: string, tenantId: string, userId: string, db: TenantDb) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice || invoice.tenantId !== tenantId) {
      throw new Error('Factura no encontrada');
    }

    if (invoice.payments.length > 0) {
      throw new Error(
        'No se puede cancelar una factura que ya tiene pagos registrados'
      );
    }

    return await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.CANCELLED,
        notes: invoice.notes
          ? `${invoice.notes}\n\nCANCELADA: ${reason}`
          : `CANCELADA: ${reason}`,
        updatedById: userId,
      },
    });
  }
}

export class GetFinancialStatsUseCase {
  static async execute(
    filters: { from?: Date; to?: Date } | undefined,
    tenantId: string,
    db: TenantDb
  ) {
    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      status: { not: InvoiceStatus.CANCELLED },
    };

    if (filters?.from || filters?.to) {
      where.issuedAt = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }

    const invoices: any[] = await db.invoice.findMany({
      where,
      include: {
        payments: true,
      },
    });

    const totalInvoiced = invoices.reduce((sum: number, invoice) => sum + Number(invoice.total), 0);

    const totalPaid = invoices.reduce((sum: number, invoice) => {
      const paid = invoice.payments.reduce((s: number, payment: any) => s + Number(payment.amount), 0);
      return sum + paid;
    }, 0);

    const totalPending = totalInvoiced - totalPaid;

    const totalLaborIncome = invoices.reduce((sum: number, invoice) => sum + Number(invoice.laborCost), 0);
    const totalPartsIncome = invoices.reduce((sum: number, invoice) => sum + Number(invoice.partsCost), 0);
    const totalPartsProfit = invoices.reduce((sum: number, invoice) => sum + Number(invoice.partsMarkup), 0);

    const invoicesByStatus = {
      paid: invoices.filter((invoice) => invoice.status === InvoiceStatus.PAID).length,
      pending: invoices.filter((invoice) => invoice.status === InvoiceStatus.PENDING).length,
      overdue: invoices.filter((invoice) => invoice.status === InvoiceStatus.OVERDUE).length,
      draft: invoices.filter((invoice) => invoice.status === InvoiceStatus.DRAFT).length,
    };

    return {
      totalInvoiced,
      totalPaid,
      totalPending,
      totalLaborIncome,
      totalPartsIncome,
      totalPartsProfit,
      invoiceCount: invoices.length,
      invoicesByStatus,
    };
  }
}
