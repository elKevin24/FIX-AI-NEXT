import { describe, it, expect, vi } from 'vitest';
import { CustomerResolver } from '@/use-cases/tickets/create-ticket/CustomerResolver';
import { ICustomerRepository } from '@/lib/repositories';

describe('CustomerResolver (SOLID SRP & DIP)', () => {
    const mockRepo: ICustomerRepository = {
        findById: vi.fn(),
        findByIdWithTickets: vi.fn(),
        findFirst: vi.fn(),
        findByEmail: vi.fn(),
        findByPhone: vi.fn(),
        findByName: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };

    it('should resolve customer by customerId if provided', async () => {
        (mockRepo.findById as any).mockResolvedValueOnce({
            id: 'cust-1',
            name: 'Existing Customer',
            email: 'exist@example.com',
        });

        const resolver = new CustomerResolver('tenant-1', 'user-1', mockRepo);
        const res = await resolver.resolve({ customerId: 'cust-1' });

        expect(mockRepo.findById).toHaveBeenCalledWith('cust-1');
        expect(res.id).toBe('cust-1');
        expect(res.name).toBe('Existing Customer');
    });

    it('should resolve customer by email if customerId not found', async () => {
        (mockRepo.findById as any).mockResolvedValueOnce(null);
        (mockRepo.findFirst as any).mockResolvedValueOnce({
            id: 'cust-by-email',
            name: 'Email Found',
            email: 'find@example.com',
        });

        const resolver = new CustomerResolver('tenant-1', 'user-1', mockRepo);
        const res = await resolver.resolve({ customerEmail: 'find@example.com' });

        expect(mockRepo.findFirst).toHaveBeenCalledWith({ where: { email: 'find@example.com' } });
        expect(res.id).toBe('cust-by-email');
    });

    it('should create a new customer if none match', async () => {
        (mockRepo.findFirst as any).mockResolvedValueOnce(null);
        (mockRepo.create as any).mockResolvedValueOnce({
            id: 'cust-new',
            name: 'New Person',
            email: 'new@example.com',
        });

        const resolver = new CustomerResolver('tenant-1', 'user-1', mockRepo);
        const res = await resolver.resolve({ customerName: 'New Person', customerEmail: 'new@example.com' });

        expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'New Person',
            email: 'new@example.com',
            tenantId: 'tenant-1',
        }));
        expect(res.id).toBe('cust-new');
    });
});
