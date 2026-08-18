import { Invoice, InvoiceStatus } from '@prisma/client';
import { IInvoiceRepository } from '@/lib/repositories/interfaces/invoice.repository.interface';
import { createActionRepositories } from '@/lib/action-factory';

/**
 * Input DTO for CancelInvoiceUseCase
 */
export interface CancelInvoiceInput {
  invoiceId: string;
  cancellationReason: string;
  tenantId: string;
  userId: string;
}

/**
 * Output DTO for CancelInvoiceUseCase
 */
export interface CancelInvoiceOutput {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  cancellationReason?: string;
}

/**
 * CancelInvoiceUseCase
 * 
 * Responsible for:
 * - Validating invoice cancellation permissions
 * - Checking invoice current status (only PENDING can be cancelled)
 * - Marking invoice as CANCELLED with reason
 * - Logging audit trail with cancellation details
 * 
 * Follows Clean Architecture:
 * - No direct Prisma dependency
 * - Depends on IInvoiceRepository abstraction
 * - Fully testable with mock repository
 * - Single Responsibility: Invoice cancellation logic only
 */
export class CancelInvoiceUseCase {
  constructor(
    private readonly invoiceRepo: IInvoiceRepository,
    private readonly auditLogRepo: ReturnType<typeof createActionRepositories>['auditLogRepo'],
  ) {}

  /**
   * Execute the use case
   */
  async execute(input: CancelInvoiceInput): Promise<CancelInvoiceOutput> {
    // Validate input
    this.validateInput(input);

    // Fetch invoice
    const invoice = await this.invoiceRepo.findById(input.invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${input.invoiceId} not found`);
    }

    // Verify tenant access
    if (invoice.tenantId !== input.tenantId) {
      throw new Error('Unauthorized: invoice belongs to different tenant');
    }

    // Check invoice status - only PENDING and PAID can be cancelled
    if (
      invoice.status !== InvoiceStatus.PENDING &&
      invoice.status !== InvoiceStatus.PAID
    ) {
      throw new Error(
        `Cannot cancel invoice with status ${invoice.status}. ` +
        `Only PENDING or PAID invoices can be cancelled.`
      );
    }

    // Update invoice status
    const cancelledInvoice = await this.invoiceRepo.update(input.invoiceId, {
      status: InvoiceStatus.CANCELLED,
      cancellationReason: input.cancellationReason,
      updatedById: input.userId,
    });

    // Log to audit trail
    try {
      await this.auditLogRepo.logAction({
        action: 'TICKET_UPDATED',
        module: 'BILLING',
        details: `Invoice ${invoice.invoiceNumber} cancelled. Reason: ${input.cancellationReason}`,
        userId: input.userId,
        tenantId: input.tenantId,
        entityType: 'Invoice',
        entityId: input.invoiceId,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          previousStatus: invoice.status,
          newStatus: InvoiceStatus.CANCELLED,
          cancellationReason: input.cancellationReason,
        },
        success: true,
      });
    } catch (error) {
      console.error('Error logging invoice cancellation to audit trail:', error);
      // Don't throw - invoice was cancelled successfully
    }

    return {
      id: cancelledInvoice.id,
      invoiceNumber: cancelledInvoice.invoiceNumber,
      status: cancelledInvoice.status,
      cancellationReason: input.cancellationReason || undefined,
    };
  }

  /**
   * Validate input data integrity
   */
  private validateInput(input: CancelInvoiceInput): void {
    if (!input.invoiceId || input.invoiceId.trim() === '') {
      throw new Error('invoiceId is required');
    }

    if (!input.cancellationReason || input.cancellationReason.trim() === '') {
      throw new Error('cancellationReason is required');
    }

    if (input.cancellationReason.length > 500) {
      throw new Error('cancellationReason must not exceed 500 characters');
    }

    if (!input.tenantId || input.tenantId.trim() === '') {
      throw new Error('tenantId is required');
    }

    if (!input.userId || input.userId.trim() === '') {
      throw new Error('userId is required');
    }
  }
}
