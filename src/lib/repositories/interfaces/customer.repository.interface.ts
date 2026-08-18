import { Customer } from '@prisma/client';

export interface ICustomerRepository {
    findById(id: string): Promise<Customer | null>;
    findByIdWithTickets(id: string): Promise<(Customer & { tickets: { id: string }[] }) | null>;
    findFirst(params: { where: { email?: string; phone?: string; name?: string } }): Promise<Customer | null>;
    findByEmail(email: string, tenantId: string): Promise<Customer | null>;
    findByPhone(phone: string, tenantId: string): Promise<Customer | null>;
    findByName(name: string, tenantId: string): Promise<Customer | null>;
    create(data: CustomerCreateInput): Promise<Customer>;
    update(id: string, data: CustomerUpdateInput): Promise<Customer>;
    delete(id: string): Promise<Customer>;
}

export interface CustomerCreateInput {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    dpi?: string | null;
    nit?: string | null;
    tenantId: string;
    createdById: string;
    updatedById: string;
}

export interface CustomerUpdateInput {
    name?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    dpi?: string | null;
    nit?: string | null;
    updatedById: string;
}