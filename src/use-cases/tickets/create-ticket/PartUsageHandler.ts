import { getTenantPrisma } from '@/lib/tenant-prisma';
import { NotFoundError, AuthorizationError, BusinessRuleError } from '@/lib/errors';

export interface PartItem {
    partId: string;
    quantity: number;
}

export interface LowStockAlert {
    name: string;
    quantity: number;
}

export class PartUsageHandler {
    constructor(
        private readonly tenantId: string,
        private readonly userId: string
    ) {}

    async processInitialParts(
        ticketId: string,
        initialParts: PartItem[]
    ): Promise<LowStockAlert[]> {
        const tenantDb = getTenantPrisma(this.tenantId, this.userId);
        const lowStockAlerts: LowStockAlert[] = [];

        for (const partItem of initialParts) {
            const part = await tenantDb.part.findUnique({ 
                where: { id: partItem.partId } 
            });

            if (!part) {
                throw new NotFoundError('Repuesto', partItem.partId);
            }
            if (part.tenantId !== this.tenantId) {
                throw new AuthorizationError('No autorizado para acceder a este repuesto');
            }
            if (part.quantity < partItem.quantity) {
                throw new BusinessRuleError(
                    `Stock insuficiente para '${part.name}'. Disponibles: ${part.quantity}, Solicitados: ${partItem.quantity}`
                );
            }

            await tenantDb.partUsage.create({
                data: {
                    ticketId,
                    partId: partItem.partId,
                    quantity: partItem.quantity,
                    approved: true,
                    priceAtProposal: part.price,
                },
            });

            if (part.quantity - partItem.quantity <= part.minStock) {
                lowStockAlerts.push({ 
                    name: part.name, 
                    quantity: part.quantity - partItem.quantity 
                });
            }
        }

        return lowStockAlerts;
    }
}