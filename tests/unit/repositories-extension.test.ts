import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaServiceTemplateRepository } from '@/lib/repositories/implementations/prisma-service-template.repository';
import { PrismaTenantSettingsRepository } from '@/lib/repositories/implementations/prisma-tenant-settings.repository';
import { createActionRepositories } from '@/lib/action-factory';

describe('Repositories Extension (ServiceTemplate & TenantSettings)', () => {
    describe('createActionRepositories Factory', () => {
        it('should instantiate all repositories including ServiceTemplate and TenantSettings', () => {
            const repos = createActionRepositories('tenant-1', 'user-1');
            expect(repos.serviceTemplateRepo).toBeDefined();
            expect(repos.tenantSettingsRepo).toBeDefined();
            expect(repos.customerRepo).toBeDefined();
            expect(repos.ticketRepo).toBeDefined();
            expect(repos.partRepo).toBeDefined();
            expect(repos.userRepo).toBeDefined();
            expect(repos.invoiceRepo).toBeDefined();
            expect(repos.cashRegisterRepo).toBeDefined();
            expect(repos.auditLogRepo).toBeDefined();
        });
    });

    describe('PrismaServiceTemplateRepository', () => {
        let repo: PrismaServiceTemplateRepository;
        let mockDb: any;

        beforeEach(() => {
            mockDb = {
                serviceTemplate: {
                    findUnique: vi.fn(),
                    findMany: vi.fn(),
                    create: vi.fn(),
                    update: vi.fn(),
                    delete: vi.fn(),
                    count: vi.fn(),
                },
            };
            repo = new PrismaServiceTemplateRepository('tenant-1', 'user-1', mockDb);
        });

        it('findById should query template by id', async () => {
            mockDb.serviceTemplate.findUnique.mockResolvedValueOnce({ id: 'tmpl-1', name: 'Mantenimiento' });
            const res = await repo.findById('tmpl-1');
            expect(mockDb.serviceTemplate.findUnique).toHaveBeenCalledWith({ where: { id: 'tmpl-1' } });
            expect(res?.name).toBe('Mantenimiento');
        });

        it('findMany should filter by category and isActive', async () => {
            mockDb.serviceTemplate.findMany.mockResolvedValueOnce([{ id: 'tmpl-1' }]);
            await repo.findMany({ category: 'MAINTENANCE' as any, isActive: true });
            expect(mockDb.serviceTemplate.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        category: 'MAINTENANCE',
                        isActive: true,
                    }),
                })
            );
        });

        it('create should save template with tenantId and createdById', async () => {
            mockDb.serviceTemplate.create.mockResolvedValueOnce({ id: 'tmpl-1', name: 'Limpieza' });
            const res = await repo.create({
                name: 'Limpieza',
                category: 'CLEANING' as any,
                defaultTitle: 'Limpieza profunda',
                defaultDescription: 'Mantenimiento preventivo',
            });
            expect(mockDb.serviceTemplate.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        name: 'Limpieza',
                        tenantId: 'tenant-1',
                        createdById: 'user-1',
                    }),
                })
            );
            expect(res.id).toBe('tmpl-1');
        });
    });

    describe('PrismaTenantSettingsRepository', () => {
        let repo: PrismaTenantSettingsRepository;
        let mockDb: any;

        beforeEach(() => {
            mockDb = {
                tenantSettings: {
                    findUnique: vi.fn(),
                    create: vi.fn(),
                    upsert: vi.fn(),
                },
            };
            repo = new PrismaTenantSettingsRepository('tenant-1', 'user-1', mockDb);
        });

        it('getSettings should find or create settings for tenant', async () => {
            mockDb.tenantSettings.findUnique.mockResolvedValueOnce({ id: 'set-1', tenantId: 'tenant-1', taxRate: 12 });
            const settings = await repo.getSettings();
            expect(mockDb.tenantSettings.findUnique).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1' } });
            expect(settings.taxRate).toBe(12);
        });

        it('getTaxRate should return numeric tax rate', async () => {
            mockDb.tenantSettings.findUnique.mockResolvedValueOnce({ id: 'set-1', tenantId: 'tenant-1', taxRate: 12 });
            const rate = await repo.getTaxRate();
            expect(rate).toBe(12);
        });

        it('updateSettings should upsert tenant settings', async () => {
            mockDb.tenantSettings.upsert.mockResolvedValueOnce({ id: 'set-1', businessName: 'Taller Fix' });
            const res = await repo.updateSettings({ businessName: 'Taller Fix' });
            expect(mockDb.tenantSettings.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { tenantId: 'tenant-1' },
                    update: expect.objectContaining({ businessName: 'Taller Fix' }),
                })
            );
            expect(res.businessName).toBe('Taller Fix');
        });
    });
});
