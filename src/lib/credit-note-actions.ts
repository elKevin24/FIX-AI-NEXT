'use server';

/**
 * Credit Note Server Actions (Thin Controller)
 * Delegating domain operations to CreditNoteUseCases.
 */

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CreditNoteStatus } from '@prisma/client';
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
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    return await GetPOSSaleForReturnUseCase.execute(saleId, db);
}

/**
 * Create a new credit note (return/refund)
 */
export async function createCreditNote(data: z.infer<typeof CreateCreditNoteSchema>) {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    const validated = CreateCreditNoteSchema.parse(data);

    const creditNote = await CreateCreditNoteUseCase.execute(
        validated,
        session.user.tenantId,
        session.user.id,
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
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    return await GetCreditNotesUseCase.execute(filters, db);
}

/**
 * Get a single credit note by ID with all details
 */
export async function getCreditNoteById(id: string) {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    return await GetCreditNoteByIdUseCase.execute(id, db);
}

/**
 * Process refund for a credit note
 */
export async function processRefund(data: z.infer<typeof ProcessRefundSchema>) {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    const validated = ProcessRefundSchema.parse(data);

    const updated = await ProcessRefundUseCase.execute(validated, session.user.id, db);

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
    const result = await CancelCreditNoteUseCase.execute(id, reason, db);

    revalidatePath('/dashboard/pos/returns');
    revalidatePath('/dashboard/pos/history');
    return result;
}

/**
 * Get credit note stats
 */
export async function getCreditNoteStats() {
    const session = await auth();
    if (!session?.user?.tenantId) throw new Error('No autorizado');

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    return await GetCreditNoteStatsUseCase.execute(db);
}

/**
 * Search POS sales for returns
 */
export async function searchSalesForReturn(search: string) {
    const session = await auth();
    if (!session?.user?.tenantId) return [];

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    return await SearchSalesForReturnUseCase.execute(search, db);
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
