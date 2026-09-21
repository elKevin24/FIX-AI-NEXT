import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllMyNotifications, createNotification } from './notifications';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { ZodError } from 'zod';

// Mock dependencias
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/tenant-prisma', () => ({ getTenantPrisma: vi.fn() }));

describe('notifications', () => {
    const mockDb = {
        notification: {
            findMany: vi.fn(),
            count: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            updateMany: vi.fn()
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (getTenantPrisma as any).mockReturnValue(mockDb);

        mockDb.notification.findMany.mockResolvedValue([]);
        mockDb.notification.count.mockResolvedValue(0);
    });

    it('getAllMyNotifications lanza ZodError si los parametros de paginación son inválidos', async () => {
        (auth as any).mockResolvedValue({
            user: { id: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' }
        });

        await expect(getAllMyNotifications(-1, 20)).rejects.toThrow(ZodError);
        await expect(getAllMyNotifications(1, 500)).rejects.toThrow(ZodError);
    });

    it('getAllMyNotifications llama a la BD con los límites correctos', async () => {
        (auth as any).mockResolvedValue({
            user: { id: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' }
        });

        await getAllMyNotifications(2, 10);
        
        expect(mockDb.notification.findMany).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
            orderBy: { createdAt: 'desc' },
            take: 10,
            skip: 10,
        });
    });

    it('createNotification inyecta el tenant correctamente a través de getTenantPrisma', async () => {
        await createNotification({
            userId: 'user-2',
            tenantId: 'tenant-x',
            type: 'INFO',
            title: 'Test',
            message: 'Message'
        });

        expect(getTenantPrisma).toHaveBeenCalledWith('tenant-x', 'user-2');
        expect(mockDb.notification.create).toHaveBeenCalledWith({
            data: {
                userId: 'user-2',
                tenantId: 'tenant-x',
                type: 'INFO',
                title: 'Test',
                message: 'Message',
                link: undefined,
            }
        });
    });
});
