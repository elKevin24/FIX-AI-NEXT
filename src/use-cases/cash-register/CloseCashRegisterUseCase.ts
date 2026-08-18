import { CashRegister, Prisma } from '@prisma/client';
import { ICashRegisterRepository } from '@/lib/repositories/interfaces/cash-register.repository.interface';
import { createActionRepositories } from '@/lib/action-factory';

/**
 * Input DTO for CloseCashRegisterUseCase
 */
export interface CloseCashRegisterInput {
  cashRegisterId: string;
  closingBalance: number;
  notes?: string;
  tenantId: string;
  userId: string;
}

/**
 * Output DTO for CloseCashRegisterUseCase
 */
export interface CloseCashRegisterOutput {
  id: string;
  name: string;
  isOpen: boolean;
  openingBalance: Prisma.Decimal;
  closingBalance: Prisma.Decimal;
  difference: Prisma.Decimal;
  closedAt: Date;
}

/**
 * CloseCashRegisterUseCase
 * 
 * Responsible for:
 * - Validating cash register closure data
 * - Checking cash register exists and is currently open
 * - Calculating balance difference (closing - opening)
 * - Closing cash register with final balance
 * - Logging audit trail with closure details
 * 
 * Follows Clean Architecture:
 * - No direct Prisma dependency
 * - Depends on ICashRegisterRepository and IAuditLogRepository abstractions
 * - Fully testable with mock repositories
 * - Single Responsibility: Cash register closing logic only
 */
export class CloseCashRegisterUseCase {
  constructor(
    private readonly cashRegisterRepo: ICashRegisterRepository,
    private readonly auditLogRepo: ReturnType<typeof createActionRepositories>['auditLogRepo'],
  ) {}

  /**
   * Execute the use case
   */
  async execute(input: CloseCashRegisterInput): Promise<CloseCashRegisterOutput> {
    // Validate input
    this.validateInput(input);

    // Fetch cash register
    const cashRegister = await this.cashRegisterRepo.findById(input.cashRegisterId);
    if (!cashRegister) {
      throw new Error(`Cash register ${input.cashRegisterId} not found`);
    }

    // Verify tenant access
    if (cashRegister.tenantId !== input.tenantId) {
      throw new Error('Unauthorized: cash register belongs to different tenant');
    }

    // Check if cash register is open
    if (!cashRegister.isOpen) {
      throw new Error(`Cash register "${cashRegister.name}" is already closed`);
    }

    // Calculate balance difference
    const openingBalance = Number(cashRegister.openingBalance);
    const difference = input.closingBalance - openingBalance;

    // Close cash register
    const closedRegister = await this.cashRegisterRepo.update(input.cashRegisterId, {
      isOpen: false,
      closingBalance: new Prisma.Decimal(input.closingBalance),
      closedAt: new Date(),
      closedById: input.userId,
      notes: input.notes,
    });

    // Log to audit trail
    try {
      await this.auditLogRepo.logAction({
        action: 'TICKET_UPDATED',
        module: 'POS',
        details: `Cash register "${cashRegister.name}" closed. ` +
                 `Opening: ${openingBalance}, Closing: ${input.closingBalance}, ` +
                 `Difference: ${difference}`,
        userId: input.userId,
        tenantId: input.tenantId,
        entityType: 'CashRegister',
        entityId: input.cashRegisterId,
        metadata: {
          cashRegisterName: cashRegister.name,
          openingBalance,
          closingBalance: input.closingBalance,
          difference,
          notes: input.notes,
        },
        success: true,
      });
    } catch (error) {
      console.error('Error logging cash register closure to audit trail:', error);
      // Don't throw - cash register was closed successfully
    }

    return {
      id: closedRegister.id,
      name: closedRegister.name,
      isOpen: closedRegister.isOpen,
      openingBalance: closedRegister.openingBalance,
      closingBalance: closedRegister.closingBalance,
      difference: new Prisma.Decimal(difference),
      closedAt: closedRegister.closedAt || new Date(),
    };
  }

  /**
   * Validate input data integrity
   */
  private validateInput(input: CloseCashRegisterInput): void {
    if (!input.cashRegisterId || input.cashRegisterId.trim() === '') {
      throw new Error('cashRegisterId is required');
    }

    if (typeof input.closingBalance !== 'number') {
      throw new Error('closingBalance must be a number');
    }

    if (input.closingBalance < 0) {
      throw new Error('closingBalance must be non-negative');
    }

    if (input.notes && input.notes.length > 500) {
      throw new Error('notes must not exceed 500 characters');
    }

    if (!input.tenantId || input.tenantId.trim() === '') {
      throw new Error('tenantId is required');
    }

    if (!input.userId || input.userId.trim() === '') {
      throw new Error('userId is required');
    }
  }
}
