import { describe, it, expect, beforeEach } from 'vitest';
import { usePosStore, type POSPart } from '@/lib/stores/usePosStore';

const mockPart1: POSPart = {
    id: 'part-1',
    name: 'Pantalla iPhone 13',
    sku: 'IPH-13-SCR',
    quantity: 5,
    price: 150,
    category: 'Pantallas',
};

const mockPart2: POSPart = {
    id: 'part-2',
    name: 'Batería Samsung S21',
    sku: 'SAM-S21-BAT',
    quantity: 10,
    price: 45,
    category: 'Baterías',
};

describe('usePosStore (Zustand POS Store)', () => {
    beforeEach(() => {
        usePosStore.getState().resetSale();
    });

    it('inicia con estado de venta limpio por defecto', () => {
        const state = usePosStore.getState();
        expect(state.cart).toEqual([]);
        expect(state.customerName).toBe('Consumidor Final');
        expect(state.customerNIT).toBe('C/F');
        expect(state.payments).toEqual([]);
        expect(state.getSubtotal()).toBe(0);
        expect(state.getTotal(12)).toBe(0);
    });

    it('añade ítems al carrito y acumula cantidad sin exceder stock', () => {
        const store = usePosStore.getState();
        store.addItem(mockPart1, 2);

        expect(usePosStore.getState().cart).toHaveLength(1);
        expect(usePosStore.getState().cart[0]?.quantity).toBe(2);

        // Añadir más
        usePosStore.getState().addItem(mockPart1, 2);
        expect(usePosStore.getState().cart[0]?.quantity).toBe(4);

        // Intentar exceder stock (maxQuantity = 5)
        usePosStore.getState().addItem(mockPart1, 5);
        expect(usePosStore.getState().cart[0]?.quantity).toBe(5);
    });

    it('calcula subtotal, descuentos por monto y porcentaje, impuestos y total correctamente', () => {
        const store = usePosStore.getState();
        store.addItem(mockPart1, 2); // 2 * 150 = 300
        store.addItem(mockPart2, 1); // 1 * 45 = 45 -> Subtotal = 345

        expect(usePosStore.getState().getSubtotal()).toBe(345);

        // Descuento en monto fijo de $45 -> base gravable = 300
        store.setDiscount(45);
        store.setDiscountType('amount');
        expect(usePosStore.getState().getDiscountAmount()).toBe(45);
        expect(usePosStore.getState().getTaxAmount(12)).toBe(36); // 300 * 0.12
        expect(usePosStore.getState().getTotal(12)).toBe(336); // 300 + 36

        // Descuento en porcentaje 10% de 345 = 34.5 -> base gravable = 310.5
        store.setDiscount(10);
        store.setDiscountType('percent');
        expect(usePosStore.getState().getDiscountAmount()).toBe(34.5);
        expect(usePosStore.getState().getTaxAmount(10)).toBe(31.05);
        expect(usePosStore.getState().getTotal(10)).toBe(341.55);
    });

    it('gestiona múltiples métodos de pago y saldo restante', () => {
        const store = usePosStore.getState();
        store.addItem(mockPart1, 1); // Subtotal = 150
        store.setDiscount(0);

        const totalWithTax = usePosStore.getState().getTotal(0); // 150
        expect(totalWithTax).toBe(150);

        // Pago 1: Efectivo 100
        store.addPayment({
            amount: 100,
            paymentMethod: 'CASH',
        });
        expect(usePosStore.getState().getTotalPaid()).toBe(100);
        expect(usePosStore.getState().getRemainingAmount(0)).toBe(50);

        // Pago 2: Tarjeta 50
        store.addPayment({
            amount: 50,
            paymentMethod: 'CREDIT_CARD',
            transactionRef: 'AUTH-999',
        });
        expect(usePosStore.getState().getTotalPaid()).toBe(150);
        expect(usePosStore.getState().getRemainingAmount(0)).toBe(0);
    });

    it('limpia la venta completa con resetSale', () => {
        const store = usePosStore.getState();
        store.addItem(mockPart1, 1);
        store.selectCustomer({ id: 'cust-1', name: 'Juan Perez', nit: '123456-7', phone: '555-1234' });
        store.addPayment({ amount: 150, paymentMethod: 'CASH' });

        usePosStore.getState().resetSale();

        const state = usePosStore.getState();
        expect(state.cart).toEqual([]);
        expect(state.selectedCustomer).toBeNull();
        expect(state.customerName).toBe('Consumidor Final');
        expect(state.payments).toEqual([]);
    });
});
