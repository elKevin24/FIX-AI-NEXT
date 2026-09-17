import { PaymentMethod, POSSaleStatus, Prisma } from '@prisma/client';

export interface POSCartItem {
  partId: string;
  quantity: number;
}

export interface POSPaymentItem {
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
}

export interface CreatePOSSaleData {
  items: POSCartItem[];
  payments: POSPaymentItem[];
  customerId?: string;
  customerName?: string;
  customerNIT?: string;
  discountAmount?: number;
  notes?: string;
}

export interface POSSaleFilters {
  status?: POSSaleStatus;
  customerId?: string;
  from?: Date;
  to?: Date;
  search?: string;
}

export interface SaleLineItem {
  partId: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SaleTotals {
  saleItems: SaleLineItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

/** Safely converts a Prisma Decimal to a plain JS number. */
export function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

/** Normalises Decimal fields on a sale row into plain numbers for API responses. */
export function normalizeSaleDecimals<
  T extends {
    subtotal: Prisma.Decimal;
    taxRate: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    total: Prisma.Decimal;
    amountPaid: Prisma.Decimal;
    changeGiven: Prisma.Decimal;
  },
>(sale: T) {
  return {
    ...sale,
    subtotal: decimalToNumber(sale.subtotal),
    taxRate: decimalToNumber(sale.taxRate),
    taxAmount: decimalToNumber(sale.taxAmount),
    discountAmount: decimalToNumber(sale.discountAmount),
    total: decimalToNumber(sale.total),
    amountPaid: decimalToNumber(sale.amountPaid),
    changeGiven: decimalToNumber(sale.changeGiven),
  };
}
