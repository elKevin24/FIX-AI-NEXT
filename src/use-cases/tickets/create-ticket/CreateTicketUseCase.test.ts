import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateTicketUseCase } from './CreateTicketUseCase';
import { CreateTicketInput } from '@/lib/schemas';

describe('CreateTicketUseCase (Dependency Injection & SOLID DIP)', () => {
    const mockCustomerResolver = {
        resolve: vi.fn(),
    };

    const mockNotificationDispatcher = {
        dispatchLowStockAlerts: vi.fn().mockResolvedValue(undefined),
        dispatchTicketCreated: vi.fn().mockResolvedValue(undefined),
    };

    const mockCreatedTicket = {
        id: 'ticket-101',
        ticketNumber: 'TK-101',
        title: 'Reparación Laptop',
        status: 'OPEN',
        tenantId: 'tenant-abc',
        customerId: 'customer-101',
        deviceType: 'Laptop',
        deviceModel: 'Dell XPS',
        assignedToId: null,
        customer: {
            id: 'customer-101',
            name: 'Carlos Ruiz',
            email: 'carlos@example.com',
        },
        assignedTo: null,
    };

    const mockTx = {
        ticket: {
            create: vi.fn().mockResolvedValue(mockCreatedTicket),
        },
        auditLog: {
            create: vi.fn().mockResolvedValue({ id: 'audit-101' }),
        },
        part: {
            findUnique: vi.fn(),
        },
        partUsage: {
            create: vi.fn().mockResolvedValue({ id: 'pu-101' }),
        },
    };

    const mockDb = {
        $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
    };

    const sampleTicketData: CreateTicketInput = {
        title: 'Reparación Laptop',
        description: 'No enciende la pantalla',
        status: 'OPEN',
        priority: 'HIGH',
        deviceType: 'Laptop',
        deviceModel: 'Dell XPS',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates a ticket injecting mock customerResolver, notificationDispatcher, and db', async () => {
        mockCustomerResolver.resolve.mockResolvedValueOnce({
            id: 'customer-101',
            name: 'Carlos Ruiz',
            email: 'carlos@example.com',
        });

        const useCase = new CreateTicketUseCase('tenant-abc', 'user-101', {
            customerResolver: mockCustomerResolver,
            notificationDispatcher: mockNotificationDispatcher,
            db: mockDb,
        });

        const result = await useCase.execute({
            ticketData: sampleTicketData,
            customerInfo: { customerName: 'Carlos Ruiz' },
            tenantId: 'tenant-abc',
            userId: 'user-101',
        });

        // 1. Verify customer was resolved
        expect(mockCustomerResolver.resolve).toHaveBeenCalledWith({ customerName: 'Carlos Ruiz' });

        // 2. Verify ticket was created in transaction
        expect(mockTx.ticket.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                title: 'Reparación Laptop',
                customerId: 'customer-101',
                tenantId: 'tenant-abc',
                createdById: 'user-101',
            }),
        }));

        // 3. Verify audit log was created
        expect(mockTx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                action: 'TICKET_CREATED',
                module: 'TICKETS',
                entityId: 'ticket-101',
            }),
        }));

        // 4. Verify notifications dispatched
        expect(mockNotificationDispatcher.dispatchTicketCreated).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'ticket-101',
                title: 'Reparación Laptop',
            })
        );

        expect(result.id).toBe('ticket-101');
        expect(result.customer.name).toBe('Carlos Ruiz');
    });

    it('processes initial parts and warns of low stock via injected notificationDispatcher', async () => {
        mockCustomerResolver.resolve.mockResolvedValueOnce({
            id: 'customer-101',
            name: 'Carlos Ruiz',
            email: 'carlos@example.com',
        });

        mockTx.part.findUnique.mockResolvedValueOnce({
            id: 'part-1',
            name: 'Pantalla OLED',
            tenantId: 'tenant-abc',
            quantity: 3,
            minStock: 2,
            price: 150,
        });

        const ticketWithParts: CreateTicketInput = {
            ...sampleTicketData,
            initialParts: [{ partId: 'part-1', quantity: 1 }],
        };

        const result = await CreateTicketUseCase.execute(
            {
                ticketData: ticketWithParts,
                customerInfo: { customerName: 'Carlos Ruiz' },
                tenantId: 'tenant-abc',
                userId: 'user-101',
            },
            {
                customerResolver: mockCustomerResolver,
                notificationDispatcher: mockNotificationDispatcher,
                db: mockDb,
            }
        );

        expect(mockTx.partUsage.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                ticketId: 'ticket-101',
                partId: 'part-1',
                quantity: 1,
            }),
        }));

        // Quantity left = 2, which is <= minStock (2), so it should dispatch a low stock alert
        expect(result.lowStockAlerts).toEqual([{ name: 'Pantalla OLED', quantity: 2 }]);
        expect(mockNotificationDispatcher.dispatchLowStockAlerts).toHaveBeenCalledWith([
            { name: 'Pantalla OLED', quantity: 2 },
        ]);
    });
});
