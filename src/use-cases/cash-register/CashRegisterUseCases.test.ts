import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  OpenCashRegisterUseCase,
  OpenCashRegisterInput,
} from './OpenCashRegisterUseCase';
import {
  CloseCashRegisterUseCase,
  CloseCashRegisterInput,
} from './CloseCashRegisterUseCase';
import { ICashRegisterRepository } from '@/lib/repositories/interfaces/cash-register.repository.interface';

// ============================================================================
// MOCKS
// ============================================================================

const createMockCashRegisterRepository = (): ICashRegisterRepository => ({
  findById: vi.fn(),
  findByIdWithTransactions: vi.fn(),
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
// TESTS: OpenCashRegisterUseCase
// ============================================================================

describe('OpenCashRegisterUseCase', () => {
  let cashRegisterRepo: ICashRegisterRepository;
  let auditLogRepo: ReturnType<typeof createMockAuditLogRepository>;
  let useCase: OpenCashRegisterUseCase;

  const mockInput: OpenCashRegisterInput = {
    name: 'Main Register',
    openingBalance: 1000,
    tenantId: 'tenant-123',
    userId: 'user-456',
  };

  const mockCreatedCashRegister = {
    id: 'cash-register-789',
    name: 'Main Register',
    isOpen: true,
    openingBalance: new Prisma.Decimal(1000),
    openedAt: new Date(),
    openedById: 'user-456',
    closingBalance: null,
    closedAt: null,
    closedById: null,
    tenantId: 'tenant-123',
    notes: null,
  };

  beforeEach(() => {
    cashRegisterRepo = createMockCashRegisterRepository();
    auditLogRepo = createMockAuditLogRepository();
    useCase = new OpenCashRegisterUseCase(cashRegisterRepo, auditLogRepo);
    vi.clearAllMocks();
  });

  it('opens cash register successfully with valid input', async () => {
    (cashRegisterRepo.findFirst as any).mockResolvedValue(null);
    (cashRegisterRepo.create as any).mockResolvedValue(
      mockCreatedCashRegister
    );

    const result = await useCase.execute(mockInput);

    expect(result.id).toBe('cash-register-789');
    expect(result.name).toBe('Main Register');
    expect(result.isOpen).toBe(true);
    expect(result.openingBalance.toString()).toBe('1000');

    expect(cashRegisterRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Main Register',
        isOpen: true,
        tenantId: 'tenant-123',
      })
    );

    expect(auditLogRepo.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TICKET_UPDATED',
        module: 'POS',
        entityType: 'CashRegister',
      })
    );
  });

  it('throws error if cash register with same name already open', async () => {
    (cashRegisterRepo.findFirst as any).mockResolvedValue({
      id: 'existing-register',
      name: 'Main Register',
      isOpen: true,
    });

    await expect(useCase.execute(mockInput)).rejects.toThrow(
      'Already an open cash register with name "Main Register"'
    );
  });

  it('throws error if name is empty', async () => {
    const invalidInput = { ...mockInput, name: '' };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'name is required'
    );
  });

  it('throws error if name exceeds 100 characters', async () => {
    const invalidInput = {
      ...mockInput,
      name: 'a'.repeat(101),
    };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'name must not exceed 100 characters'
    );
  });

  it('throws error if openingBalance is negative', async () => {
    const invalidInput = { ...mockInput, openingBalance: -10 };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'openingBalance must be non-negative'
    );
  });

  it('throws error if openingBalance is not a number', async () => {
    const invalidInput = {
      ...mockInput,
      openingBalance: 'not-a-number' as any,
    };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'openingBalance must be a number'
    );
  });

  it('throws error if tenantId is missing', async () => {
    const invalidInput = { ...mockInput, tenantId: '' };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'tenantId is required'
    );
  });

  it('throws error if userId is missing', async () => {
    const invalidInput = { ...mockInput, userId: '' };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'userId is required'
    );
  });

  it('continues when audit logging fails', async () => {
    (cashRegisterRepo.findFirst as any).mockResolvedValue(null);
    (cashRegisterRepo.create as any).mockResolvedValue(
      mockCreatedCashRegister
    );
    (auditLogRepo.logAction as any).mockRejectedValue(
      new Error('Audit log failed')
    );

    const result = await useCase.execute(mockInput);

    expect(result.id).toBe('cash-register-789');
    // Cash register opened despite audit log failure
  });
});

// ============================================================================
// TESTS: CloseCashRegisterUseCase
// ============================================================================

describe('CloseCashRegisterUseCase', () => {
  let cashRegisterRepo: ICashRegisterRepository;
  let auditLogRepo: ReturnType<typeof createMockAuditLogRepository>;
  let useCase: CloseCashRegisterUseCase;

  const mockInput: CloseCashRegisterInput = {
    cashRegisterId: 'cash-register-789',
    closingBalance: 1250,
    notes: 'End of day closing',
    tenantId: 'tenant-123',
    userId: 'user-456',
  };

  const mockOpenCashRegister = {
    id: 'cash-register-789',
    name: 'Main Register',
    isOpen: true,
    openingBalance: new Prisma.Decimal(1000),
    openedAt: new Date(),
    openedById: 'user-456',
    closingBalance: null,
    closedAt: null,
    closedById: null,
    tenantId: 'tenant-123',
    notes: null,
  };

  const mockClosedCashRegister = {
    ...mockOpenCashRegister,
    isOpen: false,
    closingBalance: new Prisma.Decimal(1250),
    closedAt: new Date(),
    closedById: 'user-456',
    notes: 'End of day closing',
  };

  beforeEach(() => {
    cashRegisterRepo = createMockCashRegisterRepository();
    auditLogRepo = createMockAuditLogRepository();
    useCase = new CloseCashRegisterUseCase(cashRegisterRepo, auditLogRepo);
    vi.clearAllMocks();
  });

  it('closes cash register successfully with valid input', async () => {
    (cashRegisterRepo.findById as any).mockResolvedValue(mockOpenCashRegister);
    (cashRegisterRepo.update as any).mockResolvedValue(mockClosedCashRegister);

    const result = await useCase.execute(mockInput);

    expect(result.id).toBe('cash-register-789');
    expect(result.name).toBe('Main Register');
    expect(result.isOpen).toBe(false);
    expect(result.openingBalance.toString()).toBe('1000');
    expect(result.closingBalance.toString()).toBe('1250');
    expect(result.difference.toString()).toBe('250');

    expect(cashRegisterRepo.update).toHaveBeenCalledWith(
      'cash-register-789',
      expect.objectContaining({
        isOpen: false,
        closingBalance: expect.anything(),
      })
    );

    expect(auditLogRepo.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TICKET_UPDATED',
        module: 'POS',
        entityType: 'CashRegister',
        metadata: expect.objectContaining({
          openingBalance: 1000,
          closingBalance: 1250,
          difference: 250,
        }),
      })
    );
  });

  it('calculates balance difference correctly', async () => {
    (cashRegisterRepo.findById as any).mockResolvedValue(mockOpenCashRegister);
    (cashRegisterRepo.update as any).mockResolvedValue(mockClosedCashRegister);

    const result = await useCase.execute(mockInput);

    // Difference: 1250 - 1000 = 250
    expect(result.difference.toString()).toBe('250');
  });

  it('handles negative balance difference (shortage)', async () => {
    const negativeInput = { ...mockInput, closingBalance: 950 };
    (cashRegisterRepo.findById as any).mockResolvedValue(mockOpenCashRegister);
    (cashRegisterRepo.update as any).mockResolvedValue({
      ...mockClosedCashRegister,
      closingBalance: new Prisma.Decimal(950),
    });

    const result = await useCase.execute(negativeInput);

    // Difference: 950 - 1000 = -50
    expect(result.difference.toString()).toBe('-50');
  });

  it('throws error if cash register not found', async () => {
    (cashRegisterRepo.findById as any).mockResolvedValue(null);

    await expect(useCase.execute(mockInput)).rejects.toThrow(
      'not found'
    );
  });

  it('throws error if cash register belongs to different tenant', async () => {
    (cashRegisterRepo.findById as any).mockResolvedValue({
      ...mockOpenCashRegister,
      tenantId: 'different-tenant',
    });

    await expect(useCase.execute(mockInput)).rejects.toThrow(
      'Unauthorized: cash register belongs to different tenant'
    );
  });

  it('throws error if cash register is already closed', async () => {
    (cashRegisterRepo.findById as any).mockResolvedValue({
      ...mockOpenCashRegister,
      isOpen: false,
    });

    await expect(useCase.execute(mockInput)).rejects.toThrow(
      'is already closed'
    );
  });

  it('throws error if closingBalance is negative', async () => {
    const invalidInput = { ...mockInput, closingBalance: -10 };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'closingBalance must be non-negative'
    );
  });

  it('throws error if closingBalance is not a number', async () => {
    const invalidInput = {
      ...mockInput,
      closingBalance: 'not-a-number' as any,
    };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'closingBalance must be a number'
    );
  });

  it('throws error if notes exceed 500 characters', async () => {
    const invalidInput = {
      ...mockInput,
      notes: 'a'.repeat(501),
    };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'notes must not exceed 500 characters'
    );
  });

  it('throws error if cashRegisterId is missing', async () => {
    const invalidInput = { ...mockInput, cashRegisterId: '' };

    await expect(useCase.execute(invalidInput)).rejects.toThrow(
      'cashRegisterId is required'
    );
  });

  it('continues when audit logging fails', async () => {
    (cashRegisterRepo.findById as any).mockResolvedValue(mockOpenCashRegister);
    (cashRegisterRepo.update as any).mockResolvedValue(mockClosedCashRegister);
    (auditLogRepo.logAction as any).mockRejectedValue(
      new Error('Audit log failed')
    );

    const result = await useCase.execute(mockInput);

    expect(result.isOpen).toBe(false);
    // Cash register closed despite audit log failure
  });
});
