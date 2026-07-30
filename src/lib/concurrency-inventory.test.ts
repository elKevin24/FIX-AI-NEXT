import { describe, it, expect, vi } from 'vitest';
import { createTicketFromTemplate } from './service-template-actions';
import { getTenantPrisma } from './tenant-prisma';
import { auth } from '@/auth';

vi.mock('@/auth');
vi.mock('./tenant-prisma');
vi.mock('next/cache');
vi.mock('@/lib/ticket-notifications');

describe('Concurrency & Inventory', () => {
    it('debería utilizar transacciones atómicas ($transaction) para evitar race conditions de inventario', async () => {
        const mockSession = { user: { id: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' } };
        (auth as any).mockResolvedValue(mockSession);

        const mockTransaction = vi.fn().mockResolvedValue({ id: 'ticket-1' });
        
        const mockDb = {
            serviceTemplate: {
                findUnique: vi.fn().mockResolvedValue({
                    id: 'template-1',
                    tenantId: 'tenant-1',
                    isActive: true,
                    defaultTitle: 'Test',
                    defaultParts: [
                        { partId: 'part-1', quantity: 1, required: true }
                    ]
                })
            },
            customer: {
                findUnique: vi.fn().mockResolvedValue({ id: 'customer-1', tenantId: 'tenant-1' })
            },
            ticket: {
                findUnique: vi.fn().mockResolvedValue({ id: 'ticket-1', tenantId: 'tenant-1', customer: { id: 'customer-1' } })
            },
            $transaction: mockTransaction
        };

        (getTenantPrisma as any).mockReturnValue(mockDb);

        const formData = new FormData();
        formData.append('templateId', 'template-1');
        formData.append('customerId', 'customer-1');

        await createTicketFromTemplate(formData);

        // Verificar que se haya llamado a $transaction
        expect(mockTransaction).toHaveBeenCalled();
    });
});
