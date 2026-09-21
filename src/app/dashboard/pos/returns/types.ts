import { CreditNoteListItem, getPOSSaleForReturn, getCreditNoteById } from '@/lib/credit-note-actions';

export type SaleSearchResult = {
    id: string;
    saleNumber: string;
    customerName: string | null;
    total: number;
    status: string;
    createdAt: Date;
};

export type SaleForReturn = Awaited<ReturnType<typeof getPOSSaleForReturn>>;
export type CreditNoteDetail = Awaited<ReturnType<typeof getCreditNoteById>>;

export type ReturnItem = {
    partId: string;
    partName: string;
    partSku: string;
    originalQuantity: number;
    availableForReturn: number;
    returnQuantity: number;
    unitPrice: number;
    selected: boolean;
};

export interface ReturnsProps {
    initialCreditNotes: CreditNoteListItem[];
    stats: {
        totalCreditNotes: number;
        thisMonthCreditNotes: number;
        pendingCreditNotes: number;
        processedThisMonth: number;
        totalRefundedAmount: number;
    };
}
