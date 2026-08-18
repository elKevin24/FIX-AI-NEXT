import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvoiceStatus, Prisma } from '@prisma/client';
import {
  CreateInvoiceUseCase,
  CreateInvoiceInput,
} from './CreateInvoiceUseCase';
import {
  CancelInvoiceUseCase,
  CancelInvoiceInput,
} from './CancelInvoiceUseCase';
import { IInvoiceRepository } from '@/lib/repositories/interfaces/invoice.repository.interface';

// ============================================================================
// MOCKS
// ============================================================================

const createMockInvoiceRepository = (): IInvoiceRepository => ({
  findById: vi.fn(),
  findByIdWithRelations: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
});

const createMockAuditLogRepository = () => ({
  logAction: vi.fn().mockResolvedValue({ id: 'audit-1' }),
  findByTenant: vi.fn(),
  findById: vi.fn(),
});

// ============================================================================
// TESTS: CreateInvoiceUseCase
// ============================================================================

describe('CreateInvoiceUseCase', () => {
  let invoiceRepo: IInvoiceRepository;
  let auditLogRepo: ReturnType<typeof createMockAuditLogRepository>;
  let useCase: CreateInvoiceUseCase;

  const mockInput: CreateInvoiceInput = {
    ticketId: 'ticket-123',
    customerId: 'customer-456',
    laborCost: 100,
    partsCost: 50,
    partsMarkup: 10,
    taxRate: 12,
    discountAmount: 5,
    customerName: 'John Doe',
    customerNIT: '1234567-8',
    customerDPI: '1234567890101',
    customerAddress: '123 Main St',
    notes: 'Test invoice',
    paymentTerms: 'Net 30',
    tenantId: 'tenant-123',
    userId: 'user-456',
  };

  const mockCreatedInvoice = {
    id: 'invoice-789',
    invoiceNumber: 'INV-0001',
    status: InvoiceStatus.PENDING,
    ticketId: 'ticket-123',
    customerId: 'customer-456',
    laborCost: new Prisma.Decimal(100),
    partsCost: new Prisma.Decimal(50),
    partsMarkup: new Prisma.Decimal(10),
    subtotal: new Prisma.Decimal(150),
    taxRate: new Prisma.Decimal(12),
    taxAmount: new Prisma.Decimal(18),
    discountAmount: new Prisma.Decimal(5),
    total: new Prisma.Decimal(163),
    customerName: 'John Doe',
    customerNIT: '1234567-8',
    customerDPI: '1234567890101',
    customerAddress: '123 Main St',
    notes: 'Test invoice',
    paymentTerms: 'Net 30',
    tenantId: 'tenant-123',
    createdById: 'user-456',
    updatedById: 'user-456',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    invoiceRepo = createMockInvoiceRepository();
    auditLogRepo = createMockAuditLogRepository();
    useCase = new CreateInvoiceUseCase(invoiceRepo, auditLogRepo);
    vi.clearAllMocks();
  });

  it('creates invoice successfully with valid input', async () => {
    (invoiceRepo.findFirst as any).mockResolvedValue(null);
    (invoiceRepo.create as any).mockResolvedValue(mockCreatedInvoice);

    const result = await useCase.execute(mockInput);

    expect(result.id).toBe('invoice-789');
    expect(result.invoiceNumber).toBe('INV-0001');
    expect(result.status).toBe(InvoiceStatus.PENDING);
    expect(result.total.toString()).toBe('163');
    expect(result.taxAmount.toString()).toBe('18');

    expect(invoiceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceNumber: 'INV-0001',
        status: InvoiceStatus.PENDING,
        ticketId: 'ticket-123',
        customerId: 'customer-456',
      })
    );

    expect(auditLogRepo.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TICKET_UPDATED',
        module: 'BILLING',
        entityType: 'Invoice',
      })
    );
  });

  it('generates sequential invoice numbers', async () => {
    const lastInvoice = { invoiceNumber: 'INV-0005' };
    (invoiceRepo.findFirst as any).mockResolvedValue(lastInvoice);
    (invoiceRepo.create as any).mockResolvedValue({
      ...mockCreatedInvoice,
      invoiceNumber: 'INV-0006',
    });

    const result = await useCase.execute(mockInput);

    expect(result.invoiceNumber).toBe('INV-0006');
  });

  it('calculates taxes correctly', async () => {
    (invoiceRepo.findFirst as any).mockResolvedValue(null);
    (invoiceRepo.create as any).mockResolvedValue(mockCreatedInvoice);

    const result = await useCase.execute(mockInput);

    // Subtotal: 100 + 50 = 150
    // Tax (12%): 150 * 0.12 = 18
    // Total: 150 + 18 - 5 = 163
    expect(result.total.toString()).toBe('163');
    expect(result.taxAmount.toString()).toBe('18');
  });

  it('throws error if ticketId is missing', async () => {
    const invalidInput = { ...mockInput, ticketId: '' };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'ticketId is required'
    );
  });

  it('throws error if customerName is missing', async () => {
    const invalidInput = { ...mockInput, customerName: '' };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'customerName is required'
    );
  });

  it('throws error if laborCost is negative', async () => {
    const invalidInput = { ...mockInput, laborCost: -10 };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'laborCost and partsCost must be non-negative'
    );
  });

  it('throws error if taxRate is out of range', async () => {
    const invalidInput = { ...mockInput, taxRate: 150 };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'taxRate must be between 0 and 100'
    );
  });

  it('continues when audit logging fails', async () => {
    (invoiceRepo.findFirst as any).mockResolvedValue(null);
    (invoiceRepo.create as any).mockResolvedValue(mockCreatedInvoice);
    (auditLogRepo.logAction as any).mockRejectedValue(
      new Error('Audit log failed')
    );

    const result = await useCase.execute(mockInput);

    expect(result.id).toBe('invoice-789');
    // Invoice created despite audit log failure
  });
});

// ============================================================================
// TESTS: CancelInvoiceUseCase
// ============================================================================

describe('CancelInvoiceUseCase', () => {
  let invoiceRepo: IInvoiceRepository;
  let auditLogRepo: ReturnType<typeof createMockAuditLogRepository>;
  let useCase: CancelInvoiceUseCase;

  const mockInput: CancelInvoiceInput = {
    invoiceId: 'invoice-789',
    cancellationReason: 'Customer requested cancellation',
    tenantId: 'tenant-123',
    userId: 'user-456',
  };

  const mockInvoice = {
    id: 'invoice-789',
    invoiceNumber: 'INV-0001',
    status: InvoiceStatus.PENDING,
    ticketId: 'ticket-123',
    customerId: 'customer-456',
    tenantId: 'tenant-123',
    createdById: 'user-456',
    updatedById: 'user-456',
    laborCost: new Prisma.Decimal(100),
    partsCost: new Prisma.Decimal(50),
    partsMarkup: new Prisma.Decimal(10),
    subtotal: new Prisma.Decimal(150),
    taxRate: new Prisma.Decimal(12),
    taxAmount: new Prisma.Decimal(18),
    discountAmount: new Prisma.Decimal(5),
    total: new Prisma.Decimal(163),
    customerName: 'John Doe',
    customerNIT: '1234567-8',
    customerDPI: '1234567890101',
    customerAddress: '123 Main St',
    notes: 'Test invoice',
    paymentTerms: 'Net 30',
    createdAt: new Date(),
    updatedAt: new Date(),
    cancellationReason: null,
  };

  beforeEach(() => {
    invoiceRepo = createMockInvoiceRepository();
    auditLogRepo = createMockAuditLogRepository();
    useCase = new CancelInvoiceUseCase(invoiceRepo, auditLogRepo);
    vi.clearAllMocks();
  });

  it('cancels invoice successfully with valid input', async () => {
    (invoiceRepo.findById as any).mockResolvedValue(mockInvoice);
    (invoiceRepo.update as any).mockResolvedValue({
      ...mockInvoice,
      status: InvoiceStatus.CANCELLED,
      cancellationReason: mockInput.cancellationReason,
    });

    const result = await useCase.execute(mockInput);

    expect(result.status).toBe(InvoiceStatus.CANCELLED);
    expect(result.cancellationReason).toBe(mockInput.cancellationReason);

    expect(invoiceRepo.update).toHaveBeenCalledWith('invoice-789', {
      status: InvoiceStatus.CANCELLED,
      cancellationReason: mockInput.cancellationReason,
      updatedById: 'user-456',
    });

    expect(auditLogRepo.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TICKET_UPDATED',
        module: 'BILLING',
        entityType: 'Invoice',
      })
    );
  });

  it('throws error if invoice not found', async () => {
    (invoiceRepo.findById as any).mockResolvedValue(null);

    await expect(useCase.execute(mockInput)).rejects.toThrow(
      'not found'
    );
  });

  it('throws error if invoice belongs to different tenant', async () => {
    (invoiceRepo.findById as any).mockResolvedValue({
      ...mockInvoice,
      tenantId: 'different-tenant',
    });

    await expect(useCase.execute(mockInput)).rejects.toThrow(
      'Unauthorized: invoice belongs to different tenant'
    );
  });

  it('throws error if invoice is not PENDING or PAID', async () => {
    (invoiceRepo.findById as any).mockResolvedValue({
      ...mockInvoice,
      status: InvoiceStatus.CANCELLED,
    });

    await expect(useCase.execute(mockInput)).rejects.toThrow(
      'Cannot cancel invoice with status CANCELLED'
    );
  });

  it('throws error if cancellationReason is missing', async () => {
    const invalidInput = { ...mockInput, cancellationReason: '' };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'cancellationReason is required'
    );
  });

  it('throws error if cancellationReason exceeds 500 characters', async () => {
    const invalidInput = {
      ...mockInput,
      cancellationReason: 'a'.repeat(501),
    };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'cancellationReason must not exceed 500 characters'
    );
  });

  it('continues when audit logging fails', async () => {
    (invoiceRepo.findById as any).mockResolvedValue(mockInvoice);
    (invoiceRepo.update as any).mockResolvedValue({
      ...mockInvoice,
      status: InvoiceStatus.CANCELLED,
    });
    (auditLogRepo.logAction as any).mockRejectedValue(
      new Error('Audit log failed')
    );

    const result = await useCase.execute(mockInput);

    expect(result.status).toBe(InvoiceStatus.CANCELLED);
    // Invoice cancelled despite audit log failure
  });
});
