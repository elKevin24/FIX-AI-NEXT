import { getTenantPrisma } from '@/lib/tenant-prisma';
import {
    ITenantSettingsRepository,
    TenantSettingsUpdateInput,
} from '../interfaces/tenant-settings.repository.interface';
import { Prisma } from '@prisma/client';

export class PrismaTenantSettingsRepository implements ITenantSettingsRepository {
    constructor(
        private readonly tenantId: string,
        private readonly userId: string = '',
        private readonly customDb?: any
    ) {}

    private get db() {
        return this.customDb ?? getTenantPrisma(this.tenantId, this.userId);
    }

    async getSettings(): Promise<any | null> {
        let settings = await this.db.tenantSettings.findUnique({
            where: { tenantId: this.tenantId },
        });

        if (!settings) {
            settings = await this.db.tenantSettings.create({
                data: {
                    tenantId: this.tenantId,
                },
            });
        }

        return settings;
    }

    async updateSettings(data: TenantSettingsUpdateInput): Promise<any> {
        const updateData: any = { ...data };
        if (data.taxRate !== undefined) {
            updateData.taxRate = new Prisma.Decimal(data.taxRate);
        }

        return await this.db.tenantSettings.upsert({
            where: { tenantId: this.tenantId },
            update: updateData,
            create: {
                tenantId: this.tenantId,
                ...updateData,
            },
        });
    }

    async getTaxRate(): Promise<number> {
        const settings = await this.getSettings();
        return settings?.taxRate ? Number(settings.taxRate) : 12;
    }
}
