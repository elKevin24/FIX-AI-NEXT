import { Invoice, InvoiceStatus, Payment } from '@prisma/client';

export interface IInvoiceRepository {
    findById(id: string): Promise<Invoice | null>;
    findByIdWithRelations(id: string): Promise<any | null>;
    findFirst(filter?: any): Promise<Invoice | null>;
    findMany(filter?: any): Promise<Invoice[]>;
    create(data: any): Promise<Invoice>;
    update(id: string, data: any): Promise<Invoice>;
    delete(id: string): Promise<Invoice>;
    count(filter?: any): Promise<number>;
}

export interface InvoiceFilters {
    tenantId: string;
    status?: InvoiceStatus;
    customerId?: string;
    ticketId?: string;
    from?: Date;
    to?: Date;
    search?: string;
    page?: number;
    limit?: number;
}

export interface PaymentFilters {
    tenantId: string;
    invoiceId?: string;
    paymentMethod?: string;
    from?: Date;
    to?: Date;
}

export interface InvoiceWithRelations extends Invoice {
    customer?: { id: string; name: string; email?: string | null } | null;
    ticket?: { id: string; ticketNumber?: string | null; status?: string | null } | null;
    payments?: Payment[];
}
