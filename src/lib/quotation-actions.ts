'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { QuotationStatus, PaymentMethod } from '@/generated/prisma';
import { getTaxRate, getTenantSettingsForDocuments } from './tenant-settings-actions';

// ============= SCHEMAS =============

const QuotationItemSchema = z.object({
    partId: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).max(100).default(0),
});

const CreateQuotationSchema = z.object({
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

const ConvertToSaleSchema = z.object({
    quotationId: z.string(),
    payments: z.array(z.object({
        method: z.nativeEnum(PaymentMethod),
        amount: z.number().min(0),
        reference: z.string().optional(),
    })).min(1, 'Debe incluir al menos un método de pago'),
    cashRegisterId: z.string().optional(),
});

// ============= TYPES =============

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

// ============= HELPER FUNCTIONS =============

async function generateQuotationNumber(db: ReturnType<typeof getTenantPrisma>): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `COT-${year}-`;

    const lastQuotation = await db.pOSQuotation.findFirst({
        where: {
            quotationNumber: { startsWith: prefix }
        },
        orderBy: { quotationNumber: 'desc' },
        select: { quotationNumber: true }
    });

    let nextNumber = 1;
    if (lastQuotation?.quotationNumber) {
        const lastNum = parseInt(lastQuotation.quotationNumber.replace(prefix, ''), 10);
        if (!isNaN(lastNum)) {
            nextNumber = lastNum + 1;
        }
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}

// ============= MAIN ACTIONS =============

/**
 * Create a new quotation
 */
export async function createQuotation(data: z.infer<typeof CreateQuotationSchema>) {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    const validated = CreateQuotationSchema.parse(data);

    // Get tax rate
    const taxRate = validated.taxRate ?? await getTaxRate();

    // Validate parts exist
    const partIds = validated.items.map(item => item.partId);
    const parts = await db.part.findMany({
        where: { id: { in: partIds } },
        select: { id: true, name: true, price: true, quantity: true }
    });

    if (parts.length !== partIds.length) {
        throw new Error('Uno o más productos no fueron encontrados');
    }

    // Calculate totals
    let subtotal = 0;
    const itemsWithCalcs = validated.items.map((item: z.infer<typeof QuotationItemSchema>) => {
        const itemSubtotal = item.unitPrice * item.quantity;
        const itemDiscount = itemSubtotal * (item.discount / 100);
        subtotal += itemSubtotal - itemDiscount;

        return {
            partId: item.partId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
        };
    });

    const globalDiscountAmount = subtotal * (validated.globalDiscount / 100);
    const discountedSubtotal = subtotal - globalDiscountAmount;
    const taxAmount = discountedSubtotal * (taxRate / 100);
    const total = discountedSubtotal + taxAmount;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validated.validDays);

    const quotationNumber = await generateQuotationNumber(db);

    const quotation = await db.pOSQuotation.create({
        data: {
            quotationNumber,
            customerId: validated.customerId || null,
            customerName: validated.customerName || 'Consumidor Final',
            customerPhone: validated.customerPhone || null,
            customerEmail: validated.customerEmail || null,
            subtotal,
            discountAmount: globalDiscountAmount,
            taxRate,
            taxAmount,
            total,
            notes: validated.notes || null,
            validUntil,
            status: 'DRAFT',
            createdById: session.user.id,
            tenantId: session.user.tenantId,
            items: {
                create: itemsWithCalcs,
            },
        },
        include: {
            customer: true,
            items: { include: { part: true } },
            createdBy: { select: { id: true, name: true } },
        },
    });

    revalidatePath('/dashboard/pos/quotations');
    return { success: true, data: quotation };
}

/**
 * Get all quotations with filters
 */
export async function getQuotations(filters?: {
    status?: QuotationStatus;
    customerId?: string;
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

    if (filters?.customerId) {
        where.customerId = filters.customerId;
    }

    if (filters?.search) {
        where.OR = [
            { quotationNumber: { contains: filters.search, mode: 'insensitive' } },
            { customerName: { contains: filters.search, mode: 'insensitive' } },
            { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
        ];
    }

    if (filters?.startDate || filters?.endDate) {
        where.createdAt = {} as Record<string, Date>;
        if (filters.startDate) (where.createdAt as Record<string, Date>).gte = filters.startDate;
        if (filters.endDate) (where.createdAt as Record<string, Date>).lte = filters.endDate;
    }

    const quotations = await db.pOSQuotation.findMany({
        where,
        include: {
            customer: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true } },
            convertedToSale: { select: { id: true, saleNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return quotations.map((q: typeof quotations[number]) => ({
        id: q.id,
        quotationNumber: q.quotationNumber,
        customerName: q.customerName,
        customerEmail: q.customerEmail,
        customerPhone: q.customerPhone,
        customer: q.customer,
        status: q.status,
        subtotal: Number(q.subtotal),
        taxAmount: Number(q.taxAmount),
        total: Number(q.total),
        validUntil: q.validUntil,
        createdAt: q.createdAt,
        createdBy: q.createdBy,
        convertedToSale: q.convertedToSale,
    })) as QuotationListItem[];
}

/**
 * Get a single quotation by ID with all details
 */
export async function getQuotationById(id: string) {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);

    const quotation = await db.pOSQuotation.findUnique({
        where: { id },
        include: {
            customer: true,
            items: {
                include: {
                    part: { select: { id: true, name: true, sku: true, price: true, quantity: true } },
                },
            },
            createdBy: { select: { id: true, name: true, email: true } },
            convertedToSale: { select: { id: true, saleNumber: true, createdAt: true } },
        },
    });

    if (!quotation) {
        throw new Error('Cotización no encontrada');
    }

    return {
        ...quotation,
        subtotal: Number(quotation.subtotal),
        discountAmount: Number(quotation.discountAmount),
        taxRate: Number(quotation.taxRate),
        taxAmount: Number(quotation.taxAmount),
        total: Number(quotation.total),
        items: quotation.items.map((item: typeof quotation.items[number]) => ({
            ...item,
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount),
            part: {
                ...item.part,
                price: Number(item.part.price),
            },
        })),
    };
}

/**
 * Update quotation status
 */
export async function updateQuotationStatus(id: string, status: QuotationStatus) {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);

    const quotation = await db.pOSQuotation.findUnique({
        where: { id },
        select: { status: true },
    });

    if (!quotation) {
        throw new Error('Cotización no encontrada');
    }

    const validTransitions: Record<QuotationStatus, QuotationStatus[]> = {
        DRAFT: ['SENT', 'CANCELLED'],
        SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
        ACCEPTED: ['CONVERTED', 'CANCELLED'],
        REJECTED: [],
        EXPIRED: [],
        CONVERTED: [],
        CANCELLED: [],
    };

    const currentStatus = quotation.status as QuotationStatus;
    if (!validTransitions[currentStatus].includes(status)) {
        throw new Error(`No se puede cambiar el estado de ${currentStatus} a ${status}`);
    }

    const updated = await db.pOSQuotation.update({
        where: { id },
        data: { status },
    });

    revalidatePath('/dashboard/pos/quotations');
    return { success: true, data: updated };
}

/**
 * Convert quotation to POS sale
 */
export async function convertQuotationToSale(data: z.infer<typeof ConvertToSaleSchema>) {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    const validated = ConvertToSaleSchema.parse(data);

    const quotation = await db.pOSQuotation.findUnique({
        where: { id: validated.quotationId },
        include: {
            items: { include: { part: true } },
        },
    });

    if (!quotation) {
        throw new Error('Cotización no encontrada');
    }

    if (quotation.status !== 'ACCEPTED') {
        throw new Error('Solo se pueden convertir cotizaciones aceptadas');
    }

    // Validate stock
    for (const item of quotation.items) {
        if (item.part.quantity < item.quantity) {
            throw new Error(`Stock insuficiente para ${item.part.name}. Disponible: ${item.part.quantity}, Requerido: ${item.quantity}`);
        }
    }

    // Validate payment total
    const totalPayments = validated.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
    const quotationTotal = Number(quotation.total);

    if (Math.abs(totalPayments - quotationTotal) > 0.01) {
        throw new Error(`El total de pagos (Q${totalPayments.toFixed(2)}) no coincide con el total de la cotización (Q${quotationTotal.toFixed(2)})`);
    }

    // Generate sale number
    const year = new Date().getFullYear();
    const prefix = `POS-${year}-`;
    const lastSale = await db.pOSSale.findFirst({
        where: { saleNumber: { startsWith: prefix } },
        orderBy: { saleNumber: 'desc' },
        select: { saleNumber: true }
    });

    let nextNumber = 1;
    if (lastSale?.saleNumber) {
        const lastNum = parseInt(lastSale.saleNumber.replace(prefix, ''), 10);
        if (!isNaN(lastNum)) nextNumber = lastNum + 1;
    }
    const saleNumber = `${prefix}${nextNumber.toString().padStart(5, '0')}`;

    // Create sale
    const sale = await db.pOSSale.create({
        data: {
            saleNumber,
            customerId: quotation.customerId,
            customerName: quotation.customerName,
            customerPhone: quotation.customerPhone,
            customerEmail: quotation.customerEmail,
            subtotal: quotation.subtotal,
            discountAmount: quotation.discountAmount,
            taxRate: quotation.taxRate,
            taxAmount: quotation.taxAmount,
            total: quotation.total,
            notes: `Convertido de cotización ${quotation.quotationNumber}`,
            status: 'COMPLETED',
            createdById: session.user.id,
            tenantId: session.user.tenantId,
            cashRegisterId: validated.cashRegisterId || null,
            quotationId: quotation.id,
            items: {
                create: quotation.items.map((item: typeof quotation.items[number]) => ({
                    partId: item.partId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discount: item.discount,
                })),
            },
            payments: {
                create: validated.payments.map((p: { method: PaymentMethod; amount: number; reference?: string }) => ({
                    method: p.method,
                    amount: p.amount,
                    reference: p.reference || null,
                })),
            },
        },
    });

    // Update stock
    for (const item of quotation.items) {
        await db.part.update({
            where: { id: item.partId },
            data: { quantity: { decrement: item.quantity } },
        });
    }

    // Update quotation status
    await db.pOSQuotation.update({
        where: { id: quotation.id },
        data: { status: 'CONVERTED' },
    });

    revalidatePath('/dashboard/pos/quotations');
    revalidatePath('/dashboard/pos/history');
    return { success: true, data: sale };
}

/**
 * Duplicate a quotation
 */
export async function duplicateQuotation(id: string) {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);

    const original = await db.pOSQuotation.findUnique({
        where: { id },
        include: { items: true },
    });

    if (!original) {
        throw new Error('Cotización no encontrada');
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 15);

    const quotationNumber = await generateQuotationNumber(db);

    const duplicate = await db.pOSQuotation.create({
        data: {
            quotationNumber,
            customerId: original.customerId,
            customerName: original.customerName,
            customerPhone: original.customerPhone,
            customerEmail: original.customerEmail,
            subtotal: original.subtotal,
            discountAmount: original.discountAmount,
            taxRate: original.taxRate,
            taxAmount: original.taxAmount,
            total: original.total,
            notes: `Duplicado de ${original.quotationNumber}`,
            validUntil,
            status: 'DRAFT',
            createdById: session.user.id,
            tenantId: session.user.tenantId,
            items: {
                create: original.items.map((item: typeof original.items[number]) => ({
                    partId: item.partId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discount: item.discount,
                })),
            },
        },
        include: {
            items: { include: { part: true } },
        },
    });

    revalidatePath('/dashboard/pos/quotations');
    return { success: true, data: duplicate };
}

/**
 * Delete a quotation (only drafts)
 */
export async function deleteQuotation(id: string) {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);

    const quotation = await db.pOSQuotation.findUnique({
        where: { id },
        select: { status: true },
    });

    if (!quotation) {
        throw new Error('Cotización no encontrada');
    }

    if (quotation.status !== 'DRAFT') {
        throw new Error('Solo se pueden eliminar cotizaciones en borrador');
    }

    await db.pOSQuotation.delete({
        where: { id },
    });

    revalidatePath('/dashboard/pos/quotations');
    return { success: true };
}

/**
 * Get quotation stats
 */
export async function getQuotationStats() {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
        totalQuotations,
        thisMonthQuotations,
        pendingQuotations,
        convertedThisMonth,
        expiredCount,
    ] = await Promise.all([
        db.pOSQuotation.count(),
        db.pOSQuotation.count({
            where: { createdAt: { gte: startOfMonth } },
        }),
        db.pOSQuotation.count({
            where: { status: { in: ['DRAFT', 'SENT', 'ACCEPTED'] } },
        }),
        db.pOSQuotation.count({
            where: { status: 'CONVERTED', createdAt: { gte: startOfMonth } },
        }),
        db.pOSQuotation.count({
            where: { status: 'EXPIRED' },
        }),
    ]);

    const sentOrBetter = await db.pOSQuotation.count({
        where: { status: { in: ['SENT', 'ACCEPTED', 'REJECTED', 'CONVERTED', 'EXPIRED'] } },
    });
    const converted = await db.pOSQuotation.count({
        where: { status: 'CONVERTED' },
    });
    const conversionRate = sentOrBetter > 0 ? (converted / sentOrBetter) * 100 : 0;

    return {
        totalQuotations,
        thisMonthQuotations,
        pendingQuotations,
        convertedThisMonth,
        expiredCount,
        conversionRate: Math.round(conversionRate * 10) / 10,
    };
}

/**
 * Mark expired quotations
 */
export async function markExpiredQuotations() {
    const session = await auth();
    if (!session?.user?.tenantId) return { success: true, expiredCount: 0 };

    const db = getTenantPrisma(session.user.tenantId, session.user.id);

    const result = await db.pOSQuotation.updateMany({
        where: {
            status: { in: ['DRAFT', 'SENT'] },
            validUntil: { lt: new Date() },
        },
        data: { status: 'EXPIRED' },
    });

    if (result.count > 0) {
        revalidatePath('/dashboard/pos/quotations');
    }

    return { success: true, expiredCount: result.count };
}

/**
 * Get data for quotation PDF/print
 */
export async function getQuotationForPrint(id: string) {
    const quotation = await getQuotationById(id);
    const settings = await getTenantSettingsForDocuments();

    return {
        quotation,
        business: settings,
    };
}
