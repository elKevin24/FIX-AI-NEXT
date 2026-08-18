import { CashRegister, Prisma } from '@prisma/client';
import { ICashRegisterRepository } from '@/lib/repositories/interfaces/cash-register.repository.interface';
import { createActionRepositories } from '@/lib/action-factory';

/**
 * Input DTO for OpenCashRegisterUseCase
 */
export interface OpenCashRegisterInput {
  name: string;
  openingBalance: number;
  tenantId: string;
  userId: string;
}

/**
 * Output DTO for OpenCashRegisterUseCase
 */
export interface OpenCashRegisterOutput {
  id: string;
  name: string;
  isOpen: boolean;
  openingBalance: Prisma.Decimal;
  openedAt: Date;
}

/**
 * OpenCashRegisterUseCase
 * 
 * Responsible for:
 * - Validating cash register data
 * - Checking for duplicate open cash registers with same name
 * - Creating cash register with initial balance
 * - Logging audit trail for opening
 * 
 * Follows Clean Architecture:
 * - No direct Prisma dependency
 * - Depends on ICashRegisterRepository and IAuditLogRepository abstractions
 * - Fully testable with mock repositories
 * - Single Responsibility: Cash register opening logic only
 */
export class OpenCashRegisterUseCase {
  constructor(
    private readonly cashRegisterRepo: ICashRegisterRepository,
    private readonly auditLogRepo: ReturnType<typeof createActionRepositories>['auditLogRepo'],
  ) {}

  /**
   * Execute the use case
   */
  async execute(input: OpenCashRegisterInput): Promise<OpenCashRegisterOutput> {
    // Validate input
    this.validateInput(input);

    // Check for duplicate open cash register with same name
    const existingOpen = await this.cashRegisterRepo.findFirst({
      where: {
        tenantId: input.tenantId,
        name: input.name,
        isOpen: true,
      },
    });

    if (existingOpen) {
      throw new Error(
        `Already an open cash register with name "${input.name}". ` +
        `Close the previous one before opening a new one.`
      );
    }

    // Create cash register
    const cashRegister = await this.cashRegisterRepo.create({
      name: input.name,
      isOpen: true,
      openedAt: new Date(),
      openingBalance: new Prisma.Decimal(input.openingBalance),
      tenantId: input.tenantId,
      openedById: input.userId,
    });

    // Log to audit trail
    try {
      await this.auditLogRepo.logAction({
        action: 'TICKET_UPDATED',
        module: 'POS',
        details: `Cash register "${input.name}" opened with balance ${input.openingBalance}`,
        userId: input.userId,
        tenantId: input.tenantId,
        entityType: 'CashRegister',
        entityId: cashRegister.id,
        metadata: {
          cashRegisterName: input.name,
          openingBalance: input.openingBalance,
        },
        success: true,
      });
    } catch (error) {
      console.error('Error logging cash register opening to audit trail:', error);
      // Don't throw - cash register was opened successfully
    }

    return {
      id: cashRegister.id,
      name: cashRegister.name,
      isOpen: cashRegister.isOpen,
      openingBalance: cashRegister.openingBalance,
      openedAt: cashRegister.openedAt || new Date(),
    };
  }

  /**
   * Validate input data integrity
   */
  private validateInput(input: OpenCashRegisterInput): void {
    if (!input.name || input.name.trim() === '') {
      throw new Error('name is required');
    }

    if (input.name.length > 100) {
      throw new Error('name must not exceed 100 characters');
    }

    if (typeof input.openingBalance !== 'number') {
      throw new Error('openingBalance must be a number');
    }

    if (input.openingBalance < 0) {
      throw new Error('openingBalance must be non-negative');
    }

    if (!input.tenantId || input.tenantId.trim() === '') {
      throw new Error('tenantId is required');
    }

    if (!input.userId || input.userId.trim() === '') {
      throw new Error('userId is required');
    }
  }
}
