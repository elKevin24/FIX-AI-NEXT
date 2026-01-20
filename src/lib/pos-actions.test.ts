import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPOSSale, voidPOSSale } from './pos-actions';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

vi.mock('@/auth');
vi.mock('@/lib/tenant-prisma');
vi.mock('next/cache');
vi.mock('next/navigation', () => ({
    redirect: vi.fn(),
}));
vi.mock('./tenant-settings-actions', () => ({
  getTaxRate: vi.fn().mockResolvedValue(12),
}));

describe('POS Actions', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      tenantId: 'tenant-1',
      role: 'ADMIN',
    },
  };

  const mockDb: any = {
    part: {
        findMany: vi.fn(),
        update: vi.fn(),
    },
    cashRegister: {
        findFirst: vi.fn(),
    },
    pOSSale: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    pOSSaleItem: { create: vi.fn() },
    pOSSalePayment: { create: vi.fn() },
    cashTransaction: { create: vi.fn() },
    $transaction: vi.fn((callback) => callback(mockDb)),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue(mockSession);
    (getTenantPrisma as any).mockReturnValue(mockDb);
  });

  describe('createPOSSale', () => {
    it('should create sale successfully', async () => {
        const validPartId = '123e4567-e89b-12d3-a456-426614174000';
        // Mock Parts
        mockDb.part.findMany.mockResolvedValue([
            { id: validPartId, name: 'Item 1', quantity: 10, price: 100 }
        ]);
        
        // Mock Cash Register (Open)
        mockDb.cashRegister.findFirst.mockResolvedValue({ id: 'cr-1', isOpen: true });

        // Mock Sale Creation to return an object with an ID
        mockDb.pOSSale.create.mockResolvedValue({ id: 'sale-123', saleNumber: 'POS-0002' });

        const saleData = {
            items: [{ partId: validPartId, quantity: 1 }],
            payments: [{ amount: 112, paymentMethod: 'CASH' as any }], // 100 + 12% tax
        };

        await createPOSSale(saleData);

        expect(mockDb.pOSSale.create).toHaveBeenCalled();
        expect(mockDb.part.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: validPartId } }),
            expect.objectContaining({ data: { quantity: { decrement: 1 } } })
        );
        expect(revalidatePath).toHaveBeenCalledWith('/dashboard/pos');
    });

    it('should fail if insuficient stock', async () => {
        const validPartId = '123e4567-e89b-12d3-a456-426614174000';
        mockDb.part.findMany.mockResolvedValue([
            { id: validPartId, name: 'Item 1', quantity: 0, price: 100 }
        ]);

        const saleData = {
            items: [{ partId: validPartId, quantity: 1 }],
            payments: [{ amount: 112, paymentMethod: 'CASH' as any }],
        };

        await expect(createPOSSale(saleData)).rejects.toThrow();
    });

    it('should fail if payment is not enough', async () => {
        const validPartId = '123e4567-e89b-12d3-a456-426614174000';
        mockDb.part.findMany.mockResolvedValue([
            { id: validPartId, name: 'Item 1', quantity: 10, price: 100 }
        ]);

        const saleData = {
            items: [{ partId: validPartId, quantity: 1 }],
            payments: [{ amount: 50, paymentMethod: 'CASH' as any }],
        };

         await expect(createPOSSale(saleData)).rejects.toThrow();
    });
  });

  describe('voidPOSSale', () => {
      it('should void sale and restore stock', async () => {
          const validSaleId = '123e4567-e89b-12d3-a456-426614174001';
          const validPartId = '123e4567-e89b-12d3-a456-426614174000';
          
          mockDb.pOSSale.findFirst.mockResolvedValue({
              id: validSaleId,
              status: 'COMPLETED',
              items: [{ partId: validPartId, quantity: 1 }],
              payments: [],
              creditNotes: []
          });

          await voidPOSSale(validSaleId, 'Mistake');

          expect(mockDb.pOSSale.update).toHaveBeenCalledWith(
              expect.objectContaining({ where: { id: validSaleId } }),
              expect.objectContaining({ 
                  data: expect.objectContaining({ 
                      status: 'VOIDED'
                  }) 
              })
          );

          expect(mockDb.part.update).toHaveBeenCalledWith(
              expect.objectContaining({ where: { id: validPartId } }),
              expect.objectContaining({ data: { quantity: { increment: 1 } } })
          );
      });
  });
});
