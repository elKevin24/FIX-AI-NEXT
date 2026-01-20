import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openCashRegister, closeCashRegister, registerCashTransaction } from './cash-register-actions';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';

vi.mock('@/auth');
vi.mock('@/lib/tenant-prisma');
vi.mock('next/cache');

describe('Cash Register Actions', () => {
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
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (auth as any).mockResolvedValue(mockSession);
        (getTenantPrisma as any).mockReturnValue(mockDb);
    });

    describe('openCashRegister', () => {
        it('should open a register successfully', async () => {
            mockDb.cashRegister.findFirst.mockResolvedValue(null); // No open register
            
            await openCashRegister({ name: 'Main', openingBalance: 100 });

            expect(mockDb.cashRegister.create).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalled();
        });

        it('should fail if already open', async () => {
             const validId = '123e4567-e89b-12d3-a456-426614174000';
             mockDb.cashRegister.findFirst.mockResolvedValue({ id: validId });
             await expect(openCashRegister({ name: 'Main', openingBalance: 100 })).rejects.toThrow(/Ya existe una caja abierta/);
        });
    });

    describe('closeCashRegister', () => {
        it('should close register successfully', async () => {
            const validId = '123e4567-e89b-12d3-a456-426614174000';
            mockDb.cashRegister.findUnique.mockResolvedValue({ 
                id: validId, 
                tenantId: 'tenant-1',
                isOpen: true,
                openingBalance: 100,
                transactions: [] 
            });

            await closeCashRegister({
                cashRegisterId: validId,
                closingBalance: 100,
                notes: 'All good'
            });

            expect(mockDb.cashRegister.update).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: validId } }),
                expect.objectContaining({ data: expect.objectContaining({ isOpen: false }) })
            );
        });
    });

    describe('registerCashTransaction', () => {
        it('should register transaction', async () => {
            const validId = '123e4567-e89b-12d3-a456-426614174000';
            mockDb.cashRegister.findUnique.mockResolvedValue({ id: validId, tenantId: 'tenant-1', isOpen: true });

            await registerCashTransaction({
                cashRegisterId: validId,
                type: 'EXPENSE',
                amount: 50,
                description: 'Lunch'
            });

            expect(mockDb.cashTransaction.create).toHaveBeenCalled();
        });
    });
});
