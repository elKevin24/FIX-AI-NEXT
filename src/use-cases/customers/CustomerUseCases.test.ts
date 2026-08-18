import { describe, it, expect, vi } from 'vitest';
import { CreateCustomerUseCase, UpdateCustomerUseCase, DeleteCustomerUseCase } from '@/use-cases/customers/CustomerUseCases';
import { ICustomerRepository } from '@/lib/repositories';

describe('CustomerUseCases with Mock Repository (SOLID DIP & Unit Testing)', () => {
    const mockRepo: ICustomerRepository = {
        findById: vi.fn(),
        findByIdWithTickets: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };

    it('should create customer using injected repository', async () => {
        (mockRepo.create as any).mockResolvedValueOnce({
            id: 'cust-123',
            name: 'John Doe',
            email: 'john@example.com',
            tenantId: 'tenant-1',
        });

        const res = await CreateCustomerUseCase.execute(
            { name: 'John Doe', email: 'john@example.com' },
            'tenant-1',
            'user-1',
            mockRepo
        );

        expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'John Doe',
            email: 'john@example.com',
            tenantId: 'tenant-1',
            createdById: 'user-1',
        }));
        expect(res.id).toBe('cust-123');
    });

    it('should prevent deleting customer with associated tickets', async () => {
        (mockRepo.findByIdWithTickets as any).mockResolvedValueOnce({
            id: 'cust-123',
            name: 'John Doe',
            tickets: [{ id: 'ticket-1' }],
        });

        await expect(
            DeleteCustomerUseCase.execute('cust-123', 'tenant-1', 'user-1', mockRepo)
        ).rejects.toThrow('el cliente tiene 1 ticket(s) asociado(s)');
    });
});
