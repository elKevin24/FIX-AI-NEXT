'use server';

/**
 * Credit Note Server Actions (Thin Controller)
 * Delegating domain operations to CreditNoteUseCases.
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CreditNoteStatus } from '@prisma/client';
import { requireTenantSession } from '@/lib/auth-context';
import { getTenantSettingsForDocuments } from './tenant-settings-actions';
import {
    CreditNoteItemSchema,
    CreateCreditNoteSchema,
    ProcessRefundSchema,
    CreditNoteListItem,
    GetPOSSaleForReturnUseCase,
    CreateCreditNoteUseCase,
    GetCreditNotesUseCase,
    GetCreditNoteByIdUseCase,
    ProcessRefundUseCase,
    CancelCreditNoteUseCase,
    GetCreditNoteStatsUseCase,
    SearchSalesForReturnUseCase,
} from '@/use-cases/credit-notes';

export type { CreditNoteListItem };

/**
 * Get a POS sale with its items for creating a credit note
 */
export async function getPOSSaleForReturn(saleId: string) {
    const { db } = await requireTenantSession();
    return await GetPOSSaleForReturnUseCase.execute(saleId, db);
}

/**
 * Create a new credit note (return/refund)
 */
export async function createCreditNote(data: z.infer<typeof CreateCreditNoteSchema>) {
    const { tenantId, userId, db } = await requireTenantSession();
    const validated = CreateCreditNoteSchema.parse(data);

    const creditNote = await CreateCreditNoteUseCase.execute(
        validated,
        tenantId,
        userId,
        db
    );

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
    const { db } = await requireTenantSession();
    return await GetCreditNotesUseCase.execute(filters, db);
}

/**
 * Get a single credit note by ID with all details
 */
export async function getCreditNoteById(id: string) {
    const { db } = await requireTenantSession();
    return await GetCreditNoteByIdUseCase.execute(id, db);
}

/**
 * Process refund for a credit note
 */
export async function processRefund(data: z.infer<typeof ProcessRefundSchema>) {
    const { userId, db } = await requireTenantSession();
    const validated = ProcessRefundSchema.parse(data);

    const updated = await ProcessRefundUseCase.execute(validated, userId, db);

    revalidatePath('/dashboard/pos/returns');
    return { success: true, data: updated };
}

/**
 * Cancel a credit note (only pending ones)
 */
export async function cancelCreditNote(id: string, reason: string) {
    const { db } = await requireTenantSession();
    const result = await CancelCreditNoteUseCase.execute(id, reason, db);

    revalidatePath('/dashboard/pos/returns');
    revalidatePath('/dashboard/pos/history');
    return result;
}

/**
 * Get credit note stats
 */
export async function getCreditNoteStats() {
    const { db } = await requireTenantSession();
    return await GetCreditNoteStatsUseCase.execute(db);
}

/**
 * Search POS sales for returns
 */
export async function searchSalesForReturn(search: string) {
    try {
        const { db } = await requireTenantSession();
        return await SearchSalesForReturnUseCase.execute(search, db);
    } catch {
        return [];
    }
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
