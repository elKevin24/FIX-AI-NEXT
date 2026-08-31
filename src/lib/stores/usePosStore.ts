import { create } from 'zustand';
import type { PaymentMethod } from '@prisma/client';

export interface POSPart {
    id: string;
    name: string;
    sku: string | null;
    quantity: number;
    price: number;
    category: string | null;
}

export interface POSCustomer {
    id: string;
    name: string;
    nit: string | null;
    phone: string | null;
}

export interface POSCartItem {
    partId: string;
    name: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    maxQuantity: number;
}

export interface POSPaymentItem {
    id: string;
    amount: number;
    paymentMethod: PaymentMethod;
    transactionRef?: string;
}

export interface POSState {
    cart: POSCartItem[];
    selectedCustomer: POSCustomer | null;
    customerName: string;
    customerNIT: string;
    discount: number;
    discountType: 'amount' | 'percent';
    notes: string;
    payments: POSPaymentItem[];

    // Cart actions
    addItem: (part: POSPart, quantity?: number) => void;
    removeItem: (partId: string) => void;
    updateQuantity: (partId: string, quantity: number) => void;
    clearCart: () => void;

    // Customer actions
    selectCustomer: (customer: POSCustomer | null) => void;
    setCustomerName: (name: string) => void;
    setCustomerNIT: (nit: string) => void;

    // Discount & Notes
    setDiscount: (discount: number) => void;
    setDiscountType: (type: 'amount' | 'percent') => void;
    setNotes: (notes: string) => void;

    // Payment actions
    addPayment: (payment: Omit<POSPaymentItem, 'id'>) => void;
    removePayment: (id: string) => void;
    clearPayments: () => void;

    // Computed totals
    getSubtotal: () => number;
    getDiscountAmount: () => number;
    getTaxAmount: (taxRate: number) => number;
    getTotal: (taxRate: number) => number;
    getTotalPaid: () => number;
    getRemainingAmount: (taxRate: number) => number;

    // Reset entire transaction
    resetSale: () => void;
}

export const usePosStore = create<POSState>((set, get) => ({
    cart: [],
    selectedCustomer: null,
    customerName: 'Consumidor Final',
    customerNIT: 'C/F',
    discount: 0,
    discountType: 'amount',
    notes: '',
    payments: [],

    addItem: (part, quantity = 1) => {
        set((state) => {
            const existingIndex = state.cart.findIndex((item) => item.partId === part.id);
            if (existingIndex >= 0) {
                const current = state.cart[existingIndex]!;
                const newQty = Math.min(current.quantity + quantity, current.maxQuantity);
                const updatedCart = [...state.cart];
                updatedCart[existingIndex] = { ...current, quantity: newQty };
                return { cart: updatedCart };
            }
            const newItem: POSCartItem = {
                partId: part.id,
                name: part.name,
                sku: part.sku,
                quantity: Math.min(quantity, part.quantity),
                unitPrice: part.price,
                maxQuantity: part.quantity,
            };
            return { cart: [...state.cart, newItem] };
        });
    },

    removeItem: (partId) => {
        set((state) => ({
            cart: state.cart.filter((item) => item.partId !== partId),
        }));
    },

    updateQuantity: (partId, quantity) => {
        set((state) => {
            if (quantity <= 0) {
                return { cart: state.cart.filter((item) => item.partId !== partId) };
            }
            return {
                cart: state.cart.map((item) =>
                    item.partId === partId
                        ? { ...item, quantity: Math.min(quantity, item.maxQuantity) }
                        : item
                ),
            };
        });
    },

    clearCart: () => set({ cart: [] }),

    selectCustomer: (customer) => {
        if (customer) {
            set({
                selectedCustomer: customer,
                customerName: customer.name,
                customerNIT: customer.nit || 'C/F',
            });
        } else {
            set({
                selectedCustomer: null,
                customerName: 'Consumidor Final',
                customerNIT: 'C/F',
            });
        }
    },

    setCustomerName: (customerName) => set({ customerName }),
    setCustomerNIT: (customerNIT) => set({ customerNIT }),
    setDiscount: (discount) => set({ discount: Math.max(0, discount) }),
    setDiscountType: (discountType) => set({ discountType }),
    setNotes: (notes) => set({ notes }),

    addPayment: (payment) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set((state) => ({
            payments: [...state.payments, { ...payment, id }],
        }));
    },

    removePayment: (id) => {
        set((state) => ({
            payments: state.payments.filter((p) => p.id !== id),
        }));
    },

    clearPayments: () => set({ payments: [] }),

    getSubtotal: () => {
        const { cart } = get();
        return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    },

    getDiscountAmount: () => {
        const { discount, discountType } = get();
        const subtotal = get().getSubtotal();
        if (discountType === 'percent') {
            return (subtotal * Math.min(100, Math.max(0, discount))) / 100;
        }
        return Math.min(subtotal, Math.max(0, discount));
    },

    getTaxAmount: (taxRate: number) => {
        const subtotal = get().getSubtotal();
        const discountAmount = get().getDiscountAmount();
        const taxable = Math.max(0, subtotal - discountAmount);
        return taxable * (taxRate / 100);
    },

    getTotal: (taxRate: number) => {
        const subtotal = get().getSubtotal();
        const discountAmount = get().getDiscountAmount();
        const taxable = Math.max(0, subtotal - discountAmount);
        const tax = get().getTaxAmount(taxRate);
        return taxable + tax;
    },

    getTotalPaid: () => {
        const { payments } = get();
        return payments.reduce((sum, p) => sum + p.amount, 0);
    },

    getRemainingAmount: (taxRate: number) => {
        const total = get().getTotal(taxRate);
        const paid = get().getTotalPaid();
        return Math.max(0, total - paid);
    },

    resetSale: () => {
        set({
            cart: [],
            selectedCustomer: null,
            customerName: 'Consumidor Final',
            customerNIT: 'C/F',
            discount: 0,
            discountType: 'amount',
            notes: '',
            payments: [],
        });
    },
}));
