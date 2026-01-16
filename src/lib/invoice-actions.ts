'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { registerInvoicePaymentInCash } from './cash-register-actions';

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
export async function generateInvoiceFromTicket(data: InvoiceData) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Verificar que el ticket existe y está cerrado
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
      invoice: true, // Check if already has invoice
    },
  });

  if (!ticket) {
    throw new Error('Ticket no encontrado');
  }

  if (ticket.tenantId !== session.user.tenantId) {
    throw new Error('No autorizado');
  }

  if (ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED') {
    throw new Error('El ticket debe estar cerrado o resuelto para generar factura');
  }

  if (ticket.invoice) {
    throw new Error('Este ticket ya tiene una factura generada');
  }

  // ========================================================================
  // CALCULAR COSTOS
  // ========================================================================

  // 1. Mano de obra (de la plantilla si existe)
  const laborCost = ticket.serviceTemplate?.laborCost
    ? Number(ticket.serviceTemplate.laborCost)
    : 0;

  // 2. Costo de partes (precio de venta)
  let partsCost = 0;
  let partsMarkup = 0;

  for (const partUsage of ticket.partsUsed) {
    const partPrice = Number(partUsage.part.price) * partUsage.quantity;
    const partCost = Number(partUsage.part.cost) * partUsage.quantity;
    partsCost += partPrice;
    partsMarkup += (partPrice - partCost);
  }

  // 3. Subtotal
  const subtotal = laborCost + partsCost;

  // 4. Impuestos (IVA - Guatemala: 12%)
  const taxRate = data.taxRate ?? 12;
  const taxAmount = (subtotal * taxRate) / 100;

  // 5. Descuento
  const discountAmount = data.discountAmount ?? 0;

  // 6. Total
  const total = subtotal + taxAmount - discountAmount;

  // ========================================================================
  // GENERAR NÚMERO DE FACTURA
  // ========================================================================

  // Obtener el último número de factura del tenant
  const lastInvoice = await db.invoice.findFirst({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });

  let invoiceNumber = 'INV-0001';
  if (lastInvoice?.invoiceNumber) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1]);
    invoiceNumber = `INV-${String(lastNumber + 1).padStart(4, '0')}`;
  }

  // ========================================================================
  // CREAR FACTURA
  // ========================================================================

  const invoice = await db.invoice.create({
    data: {
      invoiceNumber,
      status: InvoiceStatus.PENDING,
      ticketId: ticket.id,
      customerId: ticket.customerId,

      // Desglose financiero
      laborCost: new Decimal(laborCost),
      partsCost: new Decimal(partsCost),
      partsMarkup: new Decimal(partsMarkup),
      subtotal: new Decimal(subtotal),
      taxRate: new Decimal(taxRate),
      taxAmount: new Decimal(taxAmount),
      discountAmount: new Decimal(discountAmount),
      total: new Decimal(total),

      // Información del cliente (snapshot)
      customerName: ticket.customer.name,
      customerNIT: ticket.customer.nit || undefined,
      customerDPI: ticket.customer.dpi || undefined,
      customerAddress: ticket.customer.address || undefined,

      // Notas
      notes: data.notes,
      paymentTerms: data.paymentTerms || 'Pago al retirar equipo',

      // Auditoría
      tenantId: session.user.tenantId,
      createdById: session.user.id,
      updatedById: session.user.id,
    },
    include: {
      customer: true,
      ticket: true,
      payments: true,
    },
  });

  revalidatePath('/dashboard/invoices');
  revalidatePath(`/dashboard/tickets/${ticket.id}`);

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
  const session = await auth();
  if (!session?.user?.tenantId) {
    return [];
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const where: any = {
    tenantId: session.user.tenantId,
  };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.customerId) {
    where.customerId = filters.customerId;
  }

  if (filters?.from || filters?.to) {
    where.issuedAt = {};
    if (filters.from) {
      where.issuedAt.gte = filters.from;
    }
    if (filters.to) {
      where.issuedAt.lte = filters.to;
    }
  }

  const invoices = await db.invoice.findMany({
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

  return invoices;
}

/**
 * Obtiene una factura por ID
 */
export async function getInvoiceById(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const invoice = await db.invoice.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
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

  return invoice;
}

// ============================================================================
// PAYMENT REGISTRATION
// ============================================================================

/**
 * Registra un pago para una factura
 */
export async function registerPayment(data: PaymentData) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Verificar que la factura existe
  const invoice = await db.invoice.findUnique({
    where: { id: data.invoiceId },
    include: {
      payments: true,
    },
  });

  if (!invoice || invoice.tenantId !== session.user.tenantId) {
    throw new Error('Factura no encontrada');
  }

  if (invoice.status === InvoiceStatus.PAID) {
    throw new Error('Esta factura ya está pagada completamente');
  }

  if (invoice.status === InvoiceStatus.CANCELLED) {
    throw new Error('No se puede registrar pago en una factura cancelada');
  }

  // Calcular total pagado hasta ahora
  const totalPaid = invoice.payments.reduce(
    (sum: number, p: any) => sum + Number(p.amount),
    0
  );

  const remaining = Number(invoice.total) - totalPaid;

  if (data.amount > remaining) {
    throw new Error(
      `El monto excede el saldo pendiente (Q${remaining.toFixed(2)})`
    );
  }

  // Generar número de pago
  const lastPayment = await db.payment.findFirst({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: 'desc' },
    select: { paymentNumber: true },
  });

  let paymentNumber = 'PAY-0001';
  if (lastPayment?.paymentNumber) {
    const lastNumber = parseInt(lastPayment.paymentNumber.split('-')[1]);
    paymentNumber = `PAY-${String(lastNumber + 1).padStart(4, '0')}`;
  }

  // Crear pago en transacción
  const result = await db.$transaction(async (tx: any) => {
    // Crear pago
    const payment = await tx.payment.create({
      data: {
        paymentNumber,
        invoiceId: data.invoiceId,
        amount: new Decimal(data.amount),
        paymentMethod: data.paymentMethod,
        transactionRef: data.transactionRef,
        notes: data.notes,
        tenantId: session.user.tenantId,
        receivedById: session.user.id,
      },
    });

    // Calcular nuevo total pagado
    const newTotalPaid = totalPaid + data.amount;
    const isFullyPaid = newTotalPaid >= Number(invoice.total);

    // Actualizar estado de factura
    const updatedInvoice = await tx.invoice.update({
      where: { id: data.invoiceId },
      data: {
        status: isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PENDING,
        paidAt: isFullyPaid ? new Date() : invoice.paidAt,
        updatedById: session.user.id,
      },
      include: {
        payments: true,
        customer: true,
        ticket: true,
      },
    });

    // Si el pago es en efectivo, registrar en caja registradora
    if (data.paymentMethod === PaymentMethod.CASH) {
      try {
        await registerInvoicePaymentInCash(data.invoiceId, data.amount);
      } catch (error) {
        console.error('Error al registrar pago en caja:', error);
        // No lanzamos error para no revertir el pago de la factura, 
        // pero idealmente deberíamos informar al usuario.
      }
    }

    return { payment, invoice: updatedInvoice };
  });

  revalidatePath('/dashboard/invoices');
  revalidatePath(`/dashboard/invoices/${data.invoiceId}`);

  return result;
}

/**
 * Cancela una factura (solo si no tiene pagos)
 */
export async function cancelInvoice(invoiceId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      payments: true,
    },
  });

  if (!invoice || invoice.tenantId !== session.user.tenantId) {
    throw new Error('Factura no encontrada');
  }

  if (invoice.payments.length > 0) {
    throw new Error(
      'No se puede cancelar una factura que ya tiene pagos registrados'
    );
  }

  const updated = await db.invoice.update({
    where: { id: invoiceId },
    data: {
      status: InvoiceStatus.CANCELLED,
      notes: invoice.notes
        ? `${invoice.notes}\n\nCANCELADA: ${reason}`
        : `CANCELADA: ${reason}`,
      updatedById: session.user.id,
    },
  });

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
  const session = await auth();
  if (!session?.user?.tenantId) {
    return null;
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const where: any = {
    tenantId: session.user.tenantId,
    status: { not: InvoiceStatus.CANCELLED },
  };

  if (filters?.from || filters?.to) {
    where.issuedAt = {};
    if (filters.from) {
      where.issuedAt.gte = filters.from;
    }
    if (filters.to) {
      where.issuedAt.lte = filters.to;
    }
  }

  const invoices = await db.invoice.findMany({
    where,
    include: {
      payments: true,
    },
  });

  // Calcular métricas
  const totalInvoiced = invoices.reduce(
    (sum: number, inv: any) => sum + Number(inv.total),
    0
  );

  const totalPaid = invoices.reduce((sum: number, inv: any) => {
    const paid = inv.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
    return sum + paid;
  }, 0);

  const totalPending = totalInvoiced - totalPaid;

  const totalLaborIncome = invoices.reduce(
    (sum: number, inv: any) => sum + Number(inv.laborCost),
    0
  );

  const totalPartsIncome = invoices.reduce(
    (sum: number, inv: any) => sum + Number(inv.partsCost),
    0
  );

  const totalPartsProfit = invoices.reduce(
    (sum: number, inv: any) => sum + Number(inv.partsMarkup),
    0
  );

  const invoicesByStatus = {
    paid: invoices.filter((inv: any) => inv.status === InvoiceStatus.PAID).length,
    pending: invoices.filter((inv: any) => inv.status === InvoiceStatus.PENDING)
      .length,
    overdue: invoices.filter((inv: any) => inv.status === InvoiceStatus.OVERDUE)
      .length,
    draft: invoices.filter((inv: any) => inv.status === InvoiceStatus.DRAFT).length,
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
