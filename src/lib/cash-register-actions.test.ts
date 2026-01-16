import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openCashRegister, registerCashTransaction, registerInvoicePaymentInCash } from './cash-register-actions';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';

// Mock dependencies
vi.mock('@/auth');
vi.mock('@/lib/tenant-prisma');
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('cash-register-actions.ts', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      tenantId: 'tenant-1',
    },
  };

  const mockDb: any = {
    cashRegister: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    cashTransaction: {
      create: vi.fn(),
    },
    invoice: {
        findUnique: vi.fn(),
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue(mockSession);
    (getTenantPrisma as any).mockReturnValue(mockDb);
  });

  describe('openCashRegister', () => {
    it('should open a new cash register session', async () => {
      const data = { name: 'Main Cash', openingBalance: 500 };
      
      mockDb.cashRegister.findFirst.mockResolvedValue(null); // No existing open register
      mockDb.cashRegister.create.mockResolvedValue({ id: 'reg-1', ...data });

      const result = await openCashRegister(data);

      expect(mockDb.cashRegister.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          name: data.name,
          openingBalance: expect.anything(),
        })
      }));
      expect(revalidatePath).toHaveBeenCalled();
    });

    it('should throw error if a register is already open', async () => {
        mockDb.cashRegister.findFirst.mockResolvedValue({ id: 'existing' });
        await expect(openCashRegister({ name: 'Main', openingBalance: 100 })).rejects.toThrow('Ya existe una caja abierta');
    });
  });

  describe('registerInvoicePaymentInCash', () => {
    it('should register an income transaction in the open register', async () => {
      mockDb.cashRegister.findFirst.mockResolvedValue({ id: 'reg-1', isOpen: true });
      mockDb.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-001',
        customer: { name: 'Test' },
        ticket: { ticketNumber: 'T-001' }
      });

      await registerInvoicePaymentInCash('inv-1', 100);

      expect(mockDb.cashTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          type: 'INCOME',
          amount: expect.anything(),
          cashRegisterId: 'reg-1'
        })
      }));
    });
  });
});
