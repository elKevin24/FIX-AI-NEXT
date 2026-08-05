import { getTenantPrisma } from '@/lib/tenant-prisma';
import { CreateCustomerInput, UpdateCustomerInput } from '@/lib/schemas';

export class CreateCustomerUseCase {
    static async execute(data: CreateCustomerInput, tenantId: string, userId: string) {
        const tenantDb = getTenantPrisma(tenantId, userId);
        return await tenantDb.customer.create({
            data: {
                name: data.name,
                email: data.email || null,
                phone: data.phone || null,
                address: data.address || null,
                dpi: data.dpi || null,
                nit: data.nit || null,
                tenantId: tenantId,
                createdById: userId,
                updatedById: userId,
            }
        });
    }
}

export class UpdateCustomerUseCase {
    static async execute(data: UpdateCustomerInput, tenantId: string, userId: string) {
        const tenantDb = getTenantPrisma(tenantId, userId);
        const existingCustomer = await tenantDb.customer.findUnique({
            where: { id: data.customerId }
        });

        if (!existingCustomer) {
            throw new Error('Cliente no encontrado');
        }

        return await tenantDb.customer.update({
            where: { id: data.customerId },
            data: {
                name: data.name,
                email: data.email || null,
                phone: data.phone || null,
                address: data.address || null,
                dpi: data.dpi || null,
                nit: data.nit || null,
                updatedById: userId,
            },
        });
    }
}

export class DeleteCustomerUseCase {
    static async execute(customerId: string, tenantId: string, userId: string) {
        const tenantDb = getTenantPrisma(tenantId, userId);
        const existingCustomer = await tenantDb.customer.findUnique({
            where: { id: customerId },
            include: {
                tickets: { select: { id: true } }
            }
        });

        if (!existingCustomer) {
            throw new Error('Cliente no encontrado');
        }

        if (existingCustomer.tickets.length > 0) {
            throw new Error(`No se puede eliminar: el cliente tiene ${existingCustomer.tickets.length} ticket(s) asociado(s)`);
        }

        return await tenantDb.customer.delete({
            where: { id: customerId },
        });
    }
}
