import { getTenantPrisma } from '@/lib/tenant-prisma';
import { ValidationError } from '@/lib/errors';

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
    constructor(
        private readonly tenantId: string,
        private readonly userId: string
    ) {}

    async resolve(customerInfo: CustomerInfo): Promise<ResolvedCustomer> {
        const tenantDb = getTenantPrisma(this.tenantId, this.userId);
        const { customerName, customerId, customerEmail, customerPhone, customerDpi, customerNit } = customerInfo;
        
        let customer = null;

        if (customerId) {
            customer = await tenantDb.customer.findUnique({
                where: { id: customerId }
            });
        }

        if (!customer && customerEmail) {
            customer = await tenantDb.customer.findFirst({
                where: { email: customerEmail }
            });
        }

        if (!customer && customerPhone) {
            customer = await tenantDb.customer.findFirst({
                where: { phone: customerPhone }
            });
        }

        if (!customer && customerName) {
            customer = await tenantDb.customer.findFirst({
                where: { name: customerName }
            });
        }

        if (!customer) {
            if (!customerName) {
                throw new ValidationError('Nombre de cliente requerido para crear uno nuevo.', 'customerName');
            }

            customer = await tenantDb.customer.create({
                data: {
                    name: customerName,
                    email: customerEmail || null,
                    phone: customerPhone || null,
                    dpi: customerDpi || null,
                    nit: customerNit || null,
                    tenantId: this.tenantId,
                    createdById: this.userId,
                    updatedById: this.userId,
                }
            });
        }

        return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
        };
    }
}