import { Invoice, InvoiceStatus, Prisma } from '@prisma/client';
import { IInvoiceRepository } from '@/lib/repositories/interfaces/invoice.repository.interface';
import { PrismaInvoiceRepository } from '@/lib/repositories/implementations/prisma-invoice.repository';
import { createActionRepositories } from '@/lib/action-factory';

/**
 * Input DTO for CreateInvoiceUseCase
 */
export interface CreateInvoiceInput {
  ticketId: string;
  customerId: string;
  laborCost: number;
  partsCost: number;
  partsMarkup?: number;
  taxRate?: number;
  discountAmount?: number;
  customerName: string;
  customerNIT?: string;
  customerDPI?: string;
  customerAddress?: string;
  notes?: string;
  paymentTerms?: string;
  tenantId: string;
  userId: string;
}

/**
 * Output DTO for CreateInvoiceUseCase
 */
export interface CreateInvoiceOutput {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  total: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  ticketId: string;
  customerId: string;
}

/**
 * CreateInvoiceUseCase
 * 
 * Responsible for:
 * - Validating invoice data integrity
 * - Calculating taxes atomically
 * - Generating sequential invoice numbers
 * - Persisting invoice with metadata
 * - Logging audit trail
 * 
 * Follows Clean Architecture:
 * - No direct Prisma dependency
 * - Depends on IInvoiceRepository abstraction
 * - Fully testable with mock repository
 * - Single Responsibility: Invoice creation logic only
 */
export class CreateInvoiceUseCase {
  constructor(
    private readonly invoiceRepo: IInvoiceRepository,
    private readonly auditLogRepo: ReturnType<typeof createActionRepositories>['auditLogRepo'],
  ) {}

  /**
   * Execute the use case
   */
  async execute(input: CreateInvoiceInput): Promise<CreateInvoiceOutput> {
    // Validate input
    this.validateInput(input);

    // Calculate totals
    const { subtotal, taxAmount, total } = this.calculateTotals(
      input.laborCost,
      input.partsCost,
      input.taxRate || 12,
      input.discountAmount || 0
    );

    // Generate sequential invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Create invoice atomically
    const invoice = await this.invoiceRepo.create({
      invoiceNumber,
      status: InvoiceStatus.PENDING,
      ticketId: input.ticketId,
      customerId: input.customerId,
      laborCost: new Prisma.Decimal(input.laborCost),
      partsCost: new Prisma.Decimal(input.partsCost),
      partsMarkup: new Prisma.Decimal(input.partsMarkup || 0),
      subtotal: new Prisma.Decimal(subtotal),
      taxRate: new Prisma.Decimal(input.taxRate || 12),
      taxAmount: new Prisma.Decimal(taxAmount),
      discountAmount: new Prisma.Decimal(input.discountAmount || 0),
      total: new Prisma.Decimal(total),
      customerName: input.customerName,
      customerNIT: input.customerNIT,
      customerDPI: input.customerDPI,
      customerAddress: input.customerAddress,
      notes: input.notes,
      paymentTerms: input.paymentTerms || 'Pago al retirar equipo',
      tenantId: input.tenantId,
      createdById: input.userId,
      updatedById: input.userId,
    });

    // Log to audit trail
    try {
      await this.auditLogRepo.logAction({
        action: 'TICKET_UPDATED',
        module: 'BILLING',
        details: `Invoice ${invoiceNumber} created for ticket ${input.ticketId}`,
        userId: input.userId,
        tenantId: input.tenantId,
        entityType: 'Invoice',
        entityId: invoice.id,
        metadata: {
          invoiceNumber,
          ticketId: input.ticketId,
          total: total.toString(),
          taxAmount: taxAmount.toString(),
        },
        success: true,
      });
    } catch (error) {
      console.error('Error logging invoice creation to audit trail:', error);
      // Don't throw - invoice was created successfully
    }

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      total: invoice.total,
      taxAmount: invoice.taxAmount,
      ticketId: invoice.ticketId,
      customerId: invoice.customerId,
    };
  }

  /**
   * Validate input data integrity
   */
  private validateInput(input: CreateInvoiceInput): void {
    if (!input.ticketId || input.ticketId.trim() === '') {
      throw new Error('ticketId is required');
    }

    if (!input.customerId || input.customerId.trim() === '') {
      throw new Error('customerId is required');
    }

    if (!input.customerName || input.customerName.trim() === '') {
      throw new Error('customerName is required');
    }

    if (input.laborCost < 0 || input.partsCost < 0) {
      throw new Error('laborCost and partsCost must be non-negative');
    }

    if (input.taxRate && (input.taxRate < 0 || input.taxRate > 100)) {
      throw new Error('taxRate must be between 0 and 100');
    }

    if (input.discountAmount && input.discountAmount < 0) {
      throw new Error('discountAmount must be non-negative');
    }

    if (!input.tenantId || input.tenantId.trim() === '') {
      throw new Error('tenantId is required');
    }

    if (!input.userId || input.userId.trim() === '') {
      throw new Error('userId is required');
    }
  }

  /**
   * Calculate invoice totals with taxes
   */
  private calculateTotals(
    laborCost: number,
    partsCost: number,
    taxRate: number,
    discountAmount: number
  ): { subtotal: number; taxAmount: number; total: number } {
    const subtotal = laborCost + partsCost;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount - discountAmount;

    return {
      subtotal,
      taxAmount,
      total: Math.max(0, total), // Prevent negative totals
    };
  }

  /**
   * Generate next sequential invoice number
   * Format: INV-0001, INV-0002, etc.
   */
  private async generateInvoiceNumber(): Promise<string> {
    const lastInvoice = await this.invoiceRepo.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!lastInvoice?.invoiceNumber) {
      return 'INV-0001';
    }

    const parts = lastInvoice.invoiceNumber.split('-');
    const sequenceDigits = parseInt(parts[parts.length - 1] || '0', 10);
    const next = isNaN(sequenceDigits) ? 1 : sequenceDigits + 1;

    return `INV-${String(next).padStart(4, '0')}`;
  }
}
