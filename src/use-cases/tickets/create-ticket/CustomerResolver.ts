import { ValidationError } from '@/lib/errors';
import { ICustomerRepository, PrismaCustomerRepository } from '@/lib/repositories';

export interface CustomerInfo {
    customerName?: string;
    customerId?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerDpi?: string;
    customerNit?: string;
}

export interface ResolvedCustomer {
    id: string;
    name: string;
    email?: string | null;
}

export class CustomerResolver {
    private readonly customerRepo: ICustomerRepository;

    constructor(
        private readonly tenantId: string,
        private readonly userId: string,
        repo?: ICustomerRepository
    ) {
        this.customerRepo = repo || new PrismaCustomerRepository(tenantId, userId);
    }

    async resolve(customerInfo: CustomerInfo): Promise<ResolvedCustomer> {
        const { customerName, customerId, customerEmail, customerPhone, customerDpi, customerNit } = customerInfo;
        
        let customer = null;

        if (customerId) {
            customer = await this.customerRepo.findById(customerId);
        }

        if (!customer && customerEmail) {
            customer = await this.customerRepo.findFirst({
                where: { email: customerEmail }
            });
        }

        if (!customer && customerPhone) {
            customer = await this.customerRepo.findFirst({
                where: { phone: customerPhone }
            });
        }

        if (!customer && customerName) {
            customer = await this.customerRepo.findFirst({
                where: { name: customerName }
            });
        }

        if (!customer) {
            if (!customerName) {
                throw new ValidationError('Nombre de cliente requerido para crear uno nuevo.', 'customerName');
            }

            customer = await this.customerRepo.create({
                name: customerName,
                email: customerEmail || null,
                phone: customerPhone || null,
                dpi: customerDpi || null,
                nit: customerNit || null,
                tenantId: this.tenantId,
                createdById: this.userId,
                updatedById: this.userId,
            });
        }

        return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
        };
    }
}