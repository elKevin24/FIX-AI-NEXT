'use server';

/**
 * Quotation Server Actions (Thin Controller)
 * Delegating domain logic and workflows to QuotationUseCases.
 */

import { requireTenantSession, assertNotViewer } from '@/lib/auth-context';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { QuotationStatus } from '@prisma/client';
import { getTaxRate } from './tenant-settings-actions';
import {
    QuotationItemSchema,
    CreateQuotationSchema,
    ConvertToSaleSchema,
    QuotationListItem,
    CreateQuotationUseCase,
    GetQuotationsUseCase,
    GetQuotationByIdUseCase,
    UpdateQuotationStatusUseCase,
    ConvertQuotationToSaleUseCase,
    DuplicateQuotationUseCase,
    DeleteQuotationUseCase,
    GetQuotationStatsUseCase,
    MarkExpiredQuotationsUseCase,
} from '@/use-cases/quotations';

export type { QuotationListItem };

/**
 * Create a new quotation
 */
export async function createQuotation(data: z.infer<typeof CreateQuotationSchema>) {
    const { tenantId, userId, userRole, db } = await requireTenantSession();
    await assertNotViewer(userRole, 'crear cotizaciones');

    const validated = CreateQuotationSchema.parse(data);
    const taxRate = validated.taxRate ?? await getTaxRate();

    const quotation = await CreateQuotationUseCase.execute(
        validated,
        taxRate,
        tenantId,
        userId,
        db
    );

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
    const { db } = await requireTenantSession();
    return await GetQuotationsUseCase.execute(filters, db);
}

/**
 * Get a single quotation by ID with all details
 */
export async function getQuotationById(id: string) {
    const { db } = await requireTenantSession();
    return await GetQuotationByIdUseCase.execute(id, db);
}

/**
 * Update quotation status
 */
export async function updateQuotationStatus(id: string, status: QuotationStatus) {
    const { db } = await requireTenantSession();
    const updated = await UpdateQuotationStatusUseCase.execute(id, status, db);

    revalidatePath('/dashboard/pos/quotations');
    return { success: true, data: updated };
}

/**
 * Convert quotation to POS sale
 */
export async function convertQuotationToSale(data: z.infer<typeof ConvertToSaleSchema>) {
    const { tenantId, userId, db } = await requireTenantSession();
    const validated = ConvertToSaleSchema.parse(data);

    const sale = await ConvertQuotationToSaleUseCase.execute(
        validated,
        tenantId,
        userId,
        db
    );

    revalidatePath('/dashboard/pos/quotations');
    revalidatePath('/dashboard/pos/history');
    return { success: true, data: sale };
}

/**
 * Duplicate a quotation
 */
export async function duplicateQuotation(id: string) {
    const { tenantId, userId, db } = await requireTenantSession();
    const duplicate = await DuplicateQuotationUseCase.execute(id, tenantId, userId, db);

    revalidatePath('/dashboard/pos/quotations');
    return { success: true, data: duplicate };
}

/**
 * Delete a quotation (only drafts)
 */
export async function deleteQuotation(id: string) {
    const { db } = await requireTenantSession();
    const result = await DeleteQuotationUseCase.execute(id, db);

    revalidatePath('/dashboard/pos/quotations');
    return result;
}

/**
 * Get quotation stats
 */
export async function getQuotationStats() {
    const { db } = await requireTenantSession();
    return await GetQuotationStatsUseCase.execute(db);
}

/**
 * Mark expired quotations
 */
export async function markExpiredQuotations() {
    const { db } = await requireTenantSession();
    const result = await MarkExpiredQuotationsUseCase.execute(db);

    if (result.expiredCount > 0) {
        revalidatePath('/dashboard/pos/quotations');
    }

    return result;
}
