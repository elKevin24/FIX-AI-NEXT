import { CreditNoteStatus, PaymentMethod } from '@prisma/client';
import { z } from 'zod';

export const CreditNoteItemSchema = z.object({
    originalItemId: z.string().optional(),
    partId: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    reason: z.string().optional(),
});

export const CreateCreditNoteSchema = z.object({
    posSaleId: z.string(),
    items: z.array(CreditNoteItemSchema).min(1, 'Debe incluir al menos un producto'),
    reason: z.string().min(1, 'Debe especificar el motivo de la devolución'),
    refundMethod: z.nativeEnum(PaymentMethod).optional(),
    notes: z.string().optional(),
});

export const ProcessRefundSchema = z.object({
    creditNoteId: z.string(),
    refundMethod: z.nativeEnum(PaymentMethod),
    refundReference: z.string().optional(),
});

export type CreditNoteListItem = {
    id: string;
    creditNoteNumber: string;
    posSale: {
        id: string;
        saleNumber: string;
        customerName: string | null;
    };
    reason: string;
    status: CreditNoteStatus;
    subtotal: number;
    taxAmount: number;
    total: number;
    refundMethod: PaymentMethod | null;
    createdAt: Date;
    createdBy: { id: string; name: string | null };
};
