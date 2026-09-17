import { QuotationStatus, PaymentMethod } from '@prisma/client';
import { z } from 'zod';

export const QuotationItemSchema = z.object({
    partId: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).max(100).default(0),
});

export const CreateQuotationSchema = z.object({
    customerId: z.string().optional(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    customerEmail: z.string().optional(),
    items: z.array(QuotationItemSchema).min(1, 'Debe incluir al menos un producto'),
    notes: z.string().optional(),
    validDays: z.number().min(1).default(15),
    globalDiscount: z.number().min(0).max(100).default(0),
    taxRate: z.number().optional(),
});

export const ConvertToSaleSchema = z.object({
    quotationId: z.string(),
    payments: z.array(z.object({
        method: z.nativeEnum(PaymentMethod),
        amount: z.number().min(0),
        reference: z.string().optional(),
    })).min(1, 'Debe incluir al menos un método de pago'),
    cashRegisterId: z.string().optional(),
});

export type QuotationListItem = {
    id: string;
    quotationNumber: string;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    customer: { id: string; name: string; email: string | null } | null;
    status: QuotationStatus;
    subtotal: number;
    taxAmount: number;
    total: number;
    validUntil: Date;
    createdAt: Date;
    createdBy: { id: string; name: string | null };
    convertedToSale: { id: string; saleNumber: string } | null;
};
