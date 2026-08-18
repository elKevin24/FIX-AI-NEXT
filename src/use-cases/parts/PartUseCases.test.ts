import { describe, it, expect, vi } from 'vitest';
import { CreatePartUseCase, UpdatePartUseCase, DeletePartUseCase } from '@/use-cases/parts/PartUseCases';
import { IPartRepository } from '@/lib/repositories';

describe('PartUseCases with Mock Repository (SOLID DIP & Unit Testing)', () => {
    const mockRepo: IPartRepository = {
        findById: vi.fn(),
        findByIdWithUsages: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };

    it('should create part using injected repository', async () => {
        (mockRepo.create as any).mockResolvedValueOnce({
            id: 'part-1',
            name: 'SSD 512GB',
            quantity: 10,
            cost: 30,
            price: 50,
            tenantId: 'tenant-1',
        });

        const res = await CreatePartUseCase.execute(
            { name: 'SSD 512GB', quantity: 10, cost: 30, price: 50 },
            'tenant-1',
            'user-1',
            mockRepo
        );

        expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'SSD 512GB',
            quantity: 10,
            cost: 30,
            price: 50,
            tenantId: 'tenant-1',
        }));
        expect(res.id).toBe('part-1');
    });

    it('should prevent deleting part that has registered usages', async () => {
        (mockRepo.findByIdWithUsages as any).mockResolvedValueOnce({
            id: 'part-1',
            name: 'SSD 512GB',
            tenantId: 'tenant-1',
            usages: [{ id: 'usage-1' }],
        });

        await expect(
            DeletePartUseCase.execute('part-1', 'tenant-1', 'user-1', false, mockRepo)
        ).rejects.toThrow('el repuesto tiene 1 registro(s) de uso asociados');
    });
});
