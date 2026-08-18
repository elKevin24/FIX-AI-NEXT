import { describe, it, expect, vi } from 'vitest';
import { CreateUserUseCase, UpdateUserUseCase, DeleteUserUseCase } from '@/use-cases/users/UserUseCases';
import { IUserRepository } from '@/lib/repositories';

describe('UserUseCases with Mock Repository (SOLID DIP & Unit Testing)', () => {
    const mockRepo: IUserRepository = {
        findById: vi.fn(),
        findByEmail: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateStatus: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    };

    it('should prevent creating a user if email already exists', async () => {
        (mockRepo.findByEmail as any).mockResolvedValueOnce({
            id: 'user-existing',
            email: 'admin@example.com',
        });

        await expect(
            CreateUserUseCase.execute(
                { name: 'Admin', email: 'admin@example.com', password: 'password123', role: 'ADMIN' },
                'tenant-1',
                'user-1',
                mockRepo
            )
        ).rejects.toThrow('El usuario ya existe');
    });

    it('should create user when email is unique', async () => {
        (mockRepo.findByEmail as any).mockResolvedValueOnce(null);
        (mockRepo.create as any).mockResolvedValueOnce({
            id: 'user-new',
            name: 'Tech Person',
            email: 'tech@example.com',
            role: 'TECHNICIAN',
        });

        const res = await CreateUserUseCase.execute(
            { name: 'Tech Person', email: 'tech@example.com', password: 'password123', role: 'TECHNICIAN' },
            'tenant-1',
            'user-1',
            mockRepo
        );

        expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Tech Person',
            email: 'tech@example.com',
            role: 'TECHNICIAN',
            tenantId: 'tenant-1',
        }));
        expect(res.id).toBe('user-new');
    });

    it('should prevent self-deletion', async () => {
        await expect(
            DeleteUserUseCase.execute('user-1', 'tenant-1', 'user-1', mockRepo)
        ).rejects.toThrow('No puedes eliminar tu propio usuario');
    });
});
