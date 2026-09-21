import { CreateCustomerInput, UpdateCustomerInput } from '@/lib/schemas';
import { ICustomerRepository, PrismaCustomerRepository } from '@/lib/repositories';
import { NotFoundError, BusinessRuleError } from '@/lib/errors';

export class CreateCustomerUseCase {
    static async execute(
        data: CreateCustomerInput,
        tenantId: string,
        userId: string,
        repo?: ICustomerRepository
    ) {
        const customerRepo = repo || new PrismaCustomerRepository(tenantId, userId);
        return await customerRepo.create({
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address || null,
            dpi: data.dpi || null,
            nit: data.nit || null,
            tenantId: tenantId,
            createdById: userId,
            updatedById: userId,
        });
    }
}

export class UpdateCustomerUseCase {
    static async execute(
        data: UpdateCustomerInput,
        tenantId: string,
        userId: string,
        repo?: ICustomerRepository
    ) {
        const customerRepo = repo || new PrismaCustomerRepository(tenantId, userId);
        const existingCustomer = await customerRepo.findById(data.customerId);

        if (!existingCustomer) {
            throw new NotFoundError('Cliente');
        }

        return await customerRepo.update(data.customerId, {
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address || null,
            dpi: data.dpi || null,
            nit: data.nit || null,
            updatedById: userId,
        });
    }
}

export class DeleteCustomerUseCase {
    static async execute(
        customerId: string,
        tenantId: string,
        userId: string,
        repo?: ICustomerRepository
    ) {
        const customerRepo = repo || new PrismaCustomerRepository(tenantId, userId);
        const existingCustomer = await customerRepo.findByIdWithTickets(customerId);

        if (!existingCustomer) {
            throw new NotFoundError('Cliente');
        }

        if (existingCustomer.tickets && existingCustomer.tickets.length > 0) {
            throw new BusinessRuleError(`No se puede eliminar: el cliente tiene ${existingCustomer.tickets.length} ticket(s) asociado(s)`);
        }

        return await customerRepo.delete(customerId);
    }
}
