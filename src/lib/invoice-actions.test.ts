import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerPayment } from './invoice-actions';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { InvoiceStatus, PaymentMethod } from '@/generated/prisma';
import { revalidatePath } from 'next/cache';

// Mock dependencies
vi.mock('@/auth');
vi.mock('@/lib/tenant-prisma');
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('./cash-register-actions', () => ({
  registerInvoicePaymentInCash: vi.fn(),
}));

describe('invoice-actions.ts', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      tenantId: 'tenant-1',
      role: 'ADMIN',
    },
  };

  const mockDb: any = {
    invoice: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    payment: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    ticket: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(mockDb)),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue(mockSession);
    (getTenantPrisma as any).mockReturnValue(mockDb);
  });

  describe('registerPayment', () => {
    it('should register a payment and update invoice status', async () => {
      const invoiceId = 'inv-1';
      const paymentData = {
        invoiceId,
        amount: 100,
        paymentMethod: PaymentMethod.CASH,
      };

      const mockInvoice = {
        id: invoiceId,
        total: 100,
        status: InvoiceStatus.PENDING,
        tenantId: 'tenant-1',
        payments: [],
      };

      mockDb.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockDb.payment.findFirst.mockResolvedValue(null); // For payment number generation
      mockDb.payment.create.mockResolvedValue({ id: 'pay-1', amount: 100 });
      mockDb.invoice.update.mockResolvedValue({ ...mockInvoice, status: InvoiceStatus.PAID });

      await registerPayment(paymentData);

      expect(mockDb.payment.create).toHaveBeenCalled();
      expect(mockDb.invoice.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: invoiceId },
        data: expect.objectContaining({
            status: InvoiceStatus.PAID
        })
      }));
      expect(revalidatePath).toHaveBeenCalled();
    });

    it('should throw error if amount exceeds remaining balance', async () => {
        const invoiceId = 'inv-1';
        const paymentData = {
          invoiceId,
          amount: 150, // Exceeds 100
          paymentMethod: PaymentMethod.CASH,
        };
  
        const mockInvoice = {
          id: invoiceId,
          total: 100,
          status: InvoiceStatus.PENDING,
          tenantId: 'tenant-1',
          payments: [],
        };
  
        mockDb.invoice.findUnique.mockResolvedValue(mockInvoice);
  
        await expect(registerPayment(paymentData)).rejects.toThrow('El monto excede el saldo pendiente');
      });
  });
});
