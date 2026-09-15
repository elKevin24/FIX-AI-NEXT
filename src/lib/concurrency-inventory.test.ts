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
        
        const templateId = '550e8400-e29b-41d4-a716-446655440000';
        const customerId = '550e8400-e29b-41d4-a716-446655440001';

        const mockDb = {
            serviceTemplate: {
                findUnique: vi.fn().mockResolvedValue({
                    id: templateId,
                    tenantId: 'tenant-1',
                    isActive: true,
                    defaultTitle: 'Test',
                    defaultParts: [
                        { partId: 'part-1', quantity: 1, required: true }
                    ]
                })
            },
            customer: {
                findUnique: vi.fn().mockResolvedValue({ id: customerId, tenantId: 'tenant-1' })
            },
            ticket: {
                findUnique: vi.fn().mockResolvedValue({ id: 'ticket-1', tenantId: 'tenant-1', customer: { id: customerId } })
            },
            $transaction: mockTransaction
        };

        (getTenantPrisma as any).mockReturnValue(mockDb);

        const formData = new FormData();
        formData.append('templateId', templateId);
        formData.append('customerId', customerId);

        await createTicketFromTemplate(formData);

        // Verificar que se haya llamado a $transaction
        expect(mockTransaction).toHaveBeenCalled();
    });
});
