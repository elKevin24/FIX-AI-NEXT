import { describe, it, expect, vi } from 'vitest';
import { CreateManagedUserUseCase, UpdateManagedUserUseCase, DeleteUserUseCase } from '@/use-cases/users/UserManagementUseCases';

describe('UserManagementUseCases (Unit Testing)', () => {
    const mockDb: any = {
        user: {
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn(),
        },
        auditLog: {
            create: vi.fn(),
        },
    };

    it('should prevent creating a user if email already exists', async () => {
        mockDb.user.findFirst.mockResolvedValueOnce({
            id: 'user-existing',
            email: 'admin@example.com',
            tenantId: 'tenant-1',
        });

        await expect(
            CreateManagedUserUseCase.execute(
                { email: 'admin@example.com', password: 'Password123!', role: 'ADMIN', firstName: 'Admin', lastName: 'User' },
                'user-1',
                'ADMIN',
                'tenant-1',
                mockDb
            )
        ).rejects.toThrow('El usuario ya existe');
    });

    it('should create user when email is unique', async () => {
        mockDb.user.findFirst.mockResolvedValueOnce(null);
        mockDb.user.create.mockResolvedValueOnce({
            id: 'user-new',
            email: 'tech@example.com',
            role: 'TECHNICIAN',
            name: 'Tech Person',
        });
        mockDb.auditLog.create.mockResolvedValueOnce({});

        const res = await CreateManagedUserUseCase.execute(
            { email: 'tech@example.com', password: 'Password123!', role: 'TECHNICIAN', firstName: 'Tech', lastName: 'Person' },
            'user-1',
            'ADMIN',
            'tenant-1',
            mockDb
        );

        expect(mockDb.user.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                email: 'tech@example.com',
                role: 'TECHNICIAN',
                tenantId: 'tenant-1',
            }),
        }));
        expect(res.newUser.id).toBe('user-new');
    });

    it('should prevent self-deletion', async () => {
        await expect(
            DeleteUserUseCase.execute('user-1', 'tenant-1', 'user-1', mockDb)
        ).rejects.toThrow('No puedes eliminar tu propio usuario');
    });

    it('should prevent creating a user with SUPER_ADMIN role', async () => {
        await expect(
            CreateManagedUserUseCase.execute(
                { email: 'fake@example.com', password: 'Password123!', role: 'SUPER_ADMIN' as any },
                'user-1',
                'ADMIN',
                'tenant-1',
                mockDb
            )
        ).rejects.toThrow('No está permitido crear usuarios con el rol Super Administrador');
    });

    it('should prevent assigning SUPER_ADMIN role in update', async () => {
        await expect(
            UpdateManagedUserUseCase.execute(
                { userId: 'user-2', email: 'user@example.com', role: 'SUPER_ADMIN' as any },
                'user-1',
                'ADMIN',
                'tenant-1',
                mockDb
            )
        ).rejects.toThrow('No está permitido asignar el rol Super Administrador');
    });

    it('should prevent non-self modification of SUPER_ADMIN', async () => {
        mockDb.user.findUnique.mockResolvedValueOnce({
            id: 'super-admin-id',
            name: 'Super Admin',
            email: 'kevcordon5@gmail.com',
            role: 'SUPER_ADMIN',
            tenantId: 'tenant-1',
        });

        await expect(
            UpdateManagedUserUseCase.execute(
                { userId: 'super-admin-id', name: 'Tampered Name', email: 'kevcordon5@gmail.com', role: 'ADMIN' },
                'other-user-id',
                'ADMIN',
                'tenant-1',
                mockDb
            )
        ).rejects.toThrow('No autorizado para modificar al Super Administrador');
    });

    it('should prevent deleting SUPER_ADMIN user', async () => {
        mockDb.user.findUnique.mockResolvedValueOnce({
            id: 'super-admin-id',
            name: 'Super Admin',
            email: 'kevcordon5@gmail.com',
            role: 'SUPER_ADMIN',
            tenantId: 'tenant-1',
        });

        await expect(
            DeleteUserUseCase.execute('super-admin-id', 'tenant-1', 'other-user-id', mockDb)
        ).rejects.toThrow('No es posible eliminar al Super Administrador del sistema');
    });
});
