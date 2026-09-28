import { QuotationListItem, getQuotationById } from '@/lib/quotation-actions';
import { QuotationStatus, PaymentMethod } from '@prisma/client';

export type Part = {
    id: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
};

export type Customer = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
};

export type CartItem = {
    partId: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    availableStock: number;
};

export type Payment = {
    method: PaymentMethod;
    amount: number;
    reference?: string;
};

export type QuotationDetail = Awaited<ReturnType<typeof getQuotationById>>;

export interface QuotationsProps {
    initialQuotations: QuotationListItem[];
    stats: {
        totalQuotations: number;
        thisMonthQuotations: number;
        pendingQuotations: number;
        convertedThisMonth: number;
        expiredCount: number;
        conversionRate: number;
    };
    parts: Part[];
    customers: Customer[];
    taxRate: number;
}
