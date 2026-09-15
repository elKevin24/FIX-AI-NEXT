'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CreditNoteStatus, PaymentMethod } from '@/generated/prisma';
import { getTenantSettingsForDocuments } from './tenant-settings-actions';

// ============= SCHEMAS =============

const CreditNoteItemSchema = z.object({
    originalItemId: z.string().optional(),
    partId: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    reason: z.string().optional(),
});

const CreateCreditNoteSchema = z.object({
    posSaleId: z.string(),
    items: z.array(CreditNoteItemSchema).min(1, 'Debe incluir al menos un producto'),
    reason: z.string().min(1, 'Debe especificar el motivo de la devolución'),
    refundMethod: z.nativeEnum(PaymentMethod).optional(),
    notes: z.string().optional(),
});

const ProcessRefundSchema = z.object({
    creditNoteId: z.string(),
    refundMethod: z.nativeEnum(PaymentMethod),
    refundReference: z.string().optional(),
});

// ============= TYPES =============

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

// ============= HELPER FUNCTIONS =============

async function generateCreditNoteNumber(db: ReturnType<typeof getTenantPrisma>): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `NC-${year}-`;

    const lastNote = await db.creditNote.findFirst({
        where: {
            creditNoteNumber: { startsWith: prefix }
        },
        orderBy: { creditNoteNumber: 'desc' },
        select: { creditNoteNumber: true }
    });

    let nextNumber = 1;
    if (lastNote?.creditNoteNumber) {
        const lastNum = parseInt(lastNote.creditNoteNumber.replace(prefix, ''), 10);
        if (!isNaN(lastNum)) {
            nextNumber = lastNum + 1;
        }
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}

// ============= MAIN ACTIONS =============

/**
 * Get a POS sale with its items for creating a credit note
 */
export async function getPOSSaleForReturn(saleId: string) {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);

    const sale = await db.pOSSale.findUnique({
        where: { id: saleId },
        include: {
            customer: { select: { id: true, name: true, email: true, phone: true } },
            items: {
                include: {
                    part: { select: { id: true, name: true, sku: true, price: true } },
                },
            },
            payments: true,
            creditNotes: {
                include: {
                    items: true,
                },
            },
        },
    });

    if (!sale) {
        throw new Error('Venta no encontrada');
    }

    if (sale.status === 'VOIDED') {
        throw new Error('No se puede crear una nota de crédito para una venta anulada');
    }

    // Calculate already returned quantities
    const returnedQuantities: Record<string, number> = {};
    for (const creditNote of sale.creditNotes) {
        if (creditNote.status !== 'CANCELLED') {
            for (const item of creditNote.items) {
                returnedQuantities[item.partId] = (returnedQuantities[item.partId] || 0) + item.quantity;
            }
        }
    }

    return {
        ...sale,
        subtotal: Number(sale.subtotal),
        discountAmount: Number(sale.discountAmount),
        taxRate: Number(sale.taxRate),
        taxAmount: Number(sale.taxAmount),
        total: Number(sale.total),
        items: sale.items.map((item: typeof sale.items[number]) => ({
            ...item,
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount),
            returnedQuantity: returnedQuantities[item.partId] || 0,
            availableForReturn: item.quantity - (returnedQuantities[item.partId] || 0),
            part: {
                ...item.part,
                price: Number(item.part.price),
            },
        })),
        payments: sale.payments.map((p: typeof sale.payments[number]) => ({
            ...p,
            amount: Number(p.amount),
        })),
    };
}

/**
 * Create a new credit note (return/refund)
 */
export async function createCreditNote(data: z.infer<typeof CreateCreditNoteSchema>) {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    const validated = CreateCreditNoteSchema.parse(data);

    // Get the original sale
    const sale = await db.pOSSale.findUnique({
        where: { id: validated.posSaleId },
        include: {
            items: true,
            creditNotes: {
                where: { status: { not: 'CANCELLED' } },
                include: { items: true },
            },
        },
    });

    if (!sale) {
        throw new Error('Venta original no encontrada');
    }

    if (sale.status === 'VOIDED') {
        throw new Error('No se puede crear una nota de crédito para una venta anulada');
    }

    // Calculate already returned quantities
    const returnedQuantities: Record<string, number> = {};
    for (const creditNote of sale.creditNotes) {
        for (const item of creditNote.items) {
            returnedQuantities[item.partId] = (returnedQuantities[item.partId] || 0) + item.quantity;
        }
    }

    // Validate items
    for (const item of validated.items) {
        const saleItem = sale.items.find((si: typeof sale.items[number]) => si.partId === item.partId);
        if (!saleItem) {
            throw new Error(`El producto ${item.partId} no está en la venta original`);
        }

        const alreadyReturned = returnedQuantities[item.partId] || 0;
        const availableForReturn = saleItem.quantity - alreadyReturned;

        if (item.quantity > availableForReturn) {
            throw new Error(`Cantidad a devolver excede lo disponible. Disponible: ${availableForReturn}`);
        }
    }

    // Calculate totals (using original sale's tax rate)
    const taxRate = Number(sale.taxRate);
    let subtotal = 0;

    const itemsWithCalcs = validated.items.map((item: z.infer<typeof CreditNoteItemSchema>) => {
        const itemSubtotal = item.unitPrice * item.quantity;
        subtotal += itemSubtotal;

        return {
            partId: item.partId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            reason: item.reason || null,
        };
    });

    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Generate credit note number
    const creditNoteNumber = await generateCreditNoteNumber(db);

    // Create credit note
    const creditNote = await db.creditNote.create({
        data: {
            creditNoteNumber,
            posSaleId: validated.posSaleId,
            reason: validated.reason,
            subtotal,
            taxRate,
            taxAmount,
            total,
            notes: validated.notes || null,
            status: 'PENDING',
            refundMethod: validated.refundMethod || null,
            createdById: session.user.id,
            tenantId: session.user.tenantId,
            items: {
                create: itemsWithCalcs,
            },
        },
        include: {
            items: { include: { part: true } },
            posSale: { select: { id: true, saleNumber: true } },
        },
    });

    // Restore stock for returned items
    for (const item of itemsWithCalcs) {
        await db.part.update({
            where: { id: item.partId },
            data: { quantity: { increment: item.quantity } },
        });
    }

    // Update sale status based on total returns
    const allCreditNotes = await db.creditNote.findMany({
        where: {
            posSaleId: validated.posSaleId,
            status: { not: 'CANCELLED' },
        },
        select: { total: true },
    });

    const totalReturned = allCreditNotes.reduce((sum: number, cn: { total: unknown }) => sum + Number(cn.total), 0);
    const saleTotal = Number(sale.total);

    let newSaleStatus = sale.status;
    if (Math.abs(totalReturned - saleTotal) < 0.01) {
        newSaleStatus = 'FULLY_REFUNDED';
    } else if (totalReturned > 0) {
        newSaleStatus = 'PARTIALLY_REFUNDED';
    }

    if (newSaleStatus !== sale.status) {
        await db.pOSSale.update({
            where: { id: validated.posSaleId },
            data: { status: newSaleStatus },
        });
    }

    revalidatePath('/dashboard/pos/returns');
    revalidatePath('/dashboard/pos/history');
    return { success: true, data: creditNote };
}

/**
 * Get all credit notes with filters
 */
export async function getCreditNotes(filters?: {
    status?: CreditNoteStatus;
    search?: string;
    startDate?: Date;
    endDate?: Date;
}) {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);

    const where: Record<string, unknown> = {};

    if (filters?.status) {
        where.status = filters.status;
    }

    if (filters?.search) {
        where.OR = [
            { creditNoteNumber: { contains: filters.search, mode: 'insensitive' } },
        ];
    }

    if (filters?.startDate || filters?.endDate) {
        where.createdAt = {} as Record<string, Date>;
        if (filters.startDate) (where.createdAt as Record<string, Date>).gte = filters.startDate;
        if (filters.endDate) (where.createdAt as Record<string, Date>).lte = filters.endDate;
    }

    const creditNotes = await db.creditNote.findMany({
        where,
        include: {
            posSale: { select: { id: true, saleNumber: true, customerName: true } },
            createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return creditNotes.map((cn: typeof creditNotes[number]) => ({
        id: cn.id,
        creditNoteNumber: cn.creditNoteNumber,
        posSale: cn.posSale,
        reason: cn.reason,
        status: cn.status,
        subtotal: Number(cn.subtotal),
        taxAmount: Number(cn.taxAmount),
        total: Number(cn.total),
        refundMethod: cn.refundMethod,
        createdAt: cn.createdAt,
        createdBy: cn.createdBy,
    })) as CreditNoteListItem[];
}

/**
 * Get a single credit note by ID with all details
 */
export async function getCreditNoteById(id: string) {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);

    const creditNote = await db.creditNote.findUnique({
        where: { id },
        include: {
            posSale: {
                select: {
                    id: true,
                    saleNumber: true,
                    customerName: true,
                    customerEmail: true,
                    customerPhone: true,
                    customer: { select: { id: true, name: true, email: true } },
                    createdAt: true,
                },
            },
            items: {
                include: {
                    part: { select: { id: true, name: true, sku: true } },
                },
            },
            createdBy: { select: { id: true, name: true, email: true } },
            processedBy: { select: { id: true, name: true, email: true } },
        },
    });

    if (!creditNote) {
        throw new Error('Nota de crédito no encontrada');
    }

    return {
        ...creditNote,
        subtotal: Number(creditNote.subtotal),
        taxRate: Number(creditNote.taxRate),
        taxAmount: Number(creditNote.taxAmount),
        total: Number(creditNote.total),
        items: creditNote.items.map((item: typeof creditNote.items[number]) => ({
            ...item,
            unitPrice: Number(item.unitPrice),
        })),
    };
}

/**
 * Process refund for a credit note
 */
export async function processRefund(data: z.infer<typeof ProcessRefundSchema>) {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    const validated = ProcessRefundSchema.parse(data);

    const creditNote = await db.creditNote.findUnique({
        where: { id: validated.creditNoteId },
        select: { status: true },
    });

    if (!creditNote) {
        throw new Error('Nota de crédito no encontrada');
    }

    if (creditNote.status !== 'PENDING') {
        throw new Error('Solo se pueden procesar notas de crédito pendientes');
    }

    const updated = await db.creditNote.update({
        where: { id: validated.creditNoteId },
        data: {
            status: 'PROCESSED',
            refundMethod: validated.refundMethod,
            refundReference: validated.refundReference || null,
            processedAt: new Date(),
            processedById: session.user.id,
        },
    });

    revalidatePath('/dashboard/pos/returns');
    return { success: true, data: updated };
}

/**
 * Cancel a credit note (only pending ones)
 */
export async function cancelCreditNote(id: string, reason: string) {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);

    const creditNote = await db.creditNote.findUnique({
        where: { id },
        include: {
            items: true,
            posSale: { select: { id: true, status: true } },
        },
    });

    if (!creditNote) {
        throw new Error('Nota de crédito no encontrada');
    }

    if (creditNote.status !== 'PENDING') {
        throw new Error('Solo se pueden cancelar notas de crédito pendientes');
    }

    // Reverse stock changes
    for (const item of creditNote.items) {
        await db.part.update({
            where: { id: item.partId },
            data: { quantity: { decrement: item.quantity } },
        });
    }

    // Update credit note status
    await db.creditNote.update({
        where: { id },
        data: {
            status: 'CANCELLED',
            notes: creditNote.notes
                ? `${creditNote.notes}\n\nCancelada: ${reason}`
                : `Cancelada: ${reason}`,
        },
    });

    // Recalculate sale status
    const remainingCreditNotes = await db.creditNote.findMany({
        where: {
            posSaleId: creditNote.posSaleId,
            status: { not: 'CANCELLED' },
        },
        select: { total: true },
    });

    const totalReturned = remainingCreditNotes.reduce((sum: number, cn: { total: unknown }) => sum + Number(cn.total), 0);

    let newSaleStatus: 'COMPLETED' | 'PARTIALLY_REFUNDED' = 'COMPLETED';
    if (totalReturned > 0) {
        newSaleStatus = 'PARTIALLY_REFUNDED';
    }

    await db.pOSSale.update({
        where: { id: creditNote.posSaleId },
        data: { status: newSaleStatus },
    });

    revalidatePath('/dashboard/pos/returns');
    revalidatePath('/dashboard/pos/history');
    return { success: true };
}

/**
 * Get credit note stats
 */
export async function getCreditNoteStats() {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
        totalCreditNotes,
        thisMonthCreditNotes,
        pendingCreditNotes,
        processedThisMonth,
        totalRefundedAmount,
    ] = await Promise.all([
        db.creditNote.count(),
        db.creditNote.count({
            where: { createdAt: { gte: startOfMonth } },
        }),
        db.creditNote.count({
            where: { status: 'PENDING' },
        }),
        db.creditNote.count({
            where: { status: 'PROCESSED', processedAt: { gte: startOfMonth } },
        }),
        db.creditNote.aggregate({
            where: { status: 'PROCESSED' },
            _sum: { total: true },
        }),
    ]);

    return {
        totalCreditNotes,
        thisMonthCreditNotes,
        pendingCreditNotes,
        processedThisMonth,
        totalRefundedAmount: Number(totalRefundedAmount._sum.total || 0),
    };
}

/**
 * Search POS sales for returns
 */
export async function searchSalesForReturn(search: string) {
    const session = await auth();
    if (!session?.user?.tenantId) return [];

    const db = getTenantPrisma(session.user.tenantId, session.user.id);

    if (!search || search.length < 2) return [];

    const sales = await db.pOSSale.findMany({
        where: {
            status: { in: ['COMPLETED', 'PARTIALLY_REFUNDED'] },
            OR: [
                { saleNumber: { contains: search, mode: 'insensitive' } },
                { customerName: { contains: search, mode: 'insensitive' } },
                { customer: { name: { contains: search, mode: 'insensitive' } } },
            ],
        },
        include: {
            customer: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
    });

    return sales.map((s: typeof sales[number]) => ({
        id: s.id,
        saleNumber: s.saleNumber,
        customerName: s.customer?.name || s.customerName,
        total: Number(s.total),
        status: s.status,
        createdAt: s.createdAt,
    }));
}

/**
 * Get data for credit note PDF/print
 */
export async function getCreditNoteForPrint(id: string) {
    const creditNote = await getCreditNoteById(id);
    const settings = await getTenantSettingsForDocuments();

    return {
        creditNote,
        business: settings,
    };
}
