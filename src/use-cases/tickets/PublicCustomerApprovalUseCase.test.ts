import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicCustomerApprovalUseCase } from './PublicCustomerApprovalUseCase';

describe('PublicCustomerApprovalUseCase (Dependency Injection & SOLID SRP/DIP)', () => {
    const mockPublicTicket = {
        id: 'ticket-pub-1',
        ticketNumber: 'TK-PUB-01',
        tenantId: 'tenant-42',
        customer: { name: 'María López' },
    };

    const mockPendingParts = [
        {
            id: 'usage-1',
            partId: 'part-10',
            quantity: 2,
            part: { name: 'Batería 5000mAh' },
        },
    ];

    const mockTx = {
        partUsage: {
            findMany: vi.fn(),
            update: vi.fn().mockResolvedValue({}),
        },
        part: {
            findUnique: vi.fn(),
            update: vi.fn().mockResolvedValue({}),
        },
        ticket: {
            update: vi.fn().mockResolvedValue({}),
        },
        auditLog: {
            create: vi.fn().mockResolvedValue({}),
        },
        ticketNote: {
            create: vi.fn().mockResolvedValue({}),
        },
    };

    const mockTenantDb = {
        $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
    };

    const mockGlobalDb = {
        ticket: {
            findFirst: vi.fn(),
        },
    };

    const mockTenantDbProvider = vi.fn().mockReturnValue(mockTenantDb);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('lanza error si el ticketId no es válido', async () => {
        await expect(
            PublicCustomerApprovalUseCase.execute({ ticketId: '', action: 'APPROVE' })
        ).rejects.toThrow('ID de ticket no valido');
    });

    it('lanza error si el ticket no existe en la base de datos', async () => {
        mockGlobalDb.ticket.findFirst.mockResolvedValueOnce(null);

        await expect(
            PublicCustomerApprovalUseCase.execute(
                { ticketId: 'inexistente', action: 'APPROVE' },
                { globalDb: mockGlobalDb, tenantDbProvider: mockTenantDbProvider }
            )
        ).rejects.toThrow('Ticket no encontrado');
    });

    it('aprueba el presupuesto cuando el stock es suficiente', async () => {
        mockGlobalDb.ticket.findFirst.mockResolvedValueOnce(mockPublicTicket);
        mockTx.partUsage.findMany.mockResolvedValueOnce(mockPendingParts);
        mockTx.part.findUnique.mockResolvedValueOnce({
            id: 'part-10',
            name: 'Batería 5000mAh',
            quantity: 5,
        });

        const result = await PublicCustomerApprovalUseCase.execute(
            { ticketId: 'TK-PUB-01', action: 'APPROVE' },
            { globalDb: mockGlobalDb, tenantDbProvider: mockTenantDbProvider }
        );

        expect(result.success).toBe(true);
        expect(result.newStatus).toBe('IN_PROGRESS');

        // Verify part usage updated
        expect(mockTx.partUsage.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'usage-1' },
            data: expect.objectContaining({ approved: true }),
        }));

        // Verify atomic inventory decrement
        expect(mockTx.part.update).toHaveBeenCalledWith({
            where: { id: 'part-10' },
            data: { quantity: { decrement: 2 } },
        });

        // Verify ticket status moved to IN_PROGRESS
        expect(mockTx.ticket.update).toHaveBeenCalledWith({
            where: { id: 'ticket-pub-1' },
            data: { status: 'IN_PROGRESS' },
        });

        // Verify audit log
        expect(mockTx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                action: 'CUSTOMER_BUDGET_APPROVED',
                tenantId: 'tenant-42',
            }),
        }));
    });

    it('lanza error si no hay stock suficiente para aprobar', async () => {
        mockGlobalDb.ticket.findFirst.mockResolvedValueOnce(mockPublicTicket);
        mockTx.partUsage.findMany.mockResolvedValueOnce(mockPendingParts);
        mockTx.part.findUnique.mockResolvedValueOnce({
            id: 'part-10',
            name: 'Batería 5000mAh',
            quantity: 1, // Only 1 available, but 2 requested
        });

        await expect(
            PublicCustomerApprovalUseCase.execute(
                { ticketId: 'TK-PUB-01', action: 'APPROVE' },
                { globalDb: mockGlobalDb, tenantDbProvider: mockTenantDbProvider }
            )
        ).rejects.toThrow('Stock insuficiente para el repuesto: Batería 5000mAh');
    });

    it('rechaza el presupuesto y cancela el ticket', async () => {
        mockGlobalDb.ticket.findFirst.mockResolvedValueOnce(mockPublicTicket);

        const result = await PublicCustomerApprovalUseCase.execute(
            { ticketId: 'TK-PUB-01', action: 'REJECT', rejectionReason: 'Muy costoso' },
            { globalDb: mockGlobalDb, tenantDbProvider: mockTenantDbProvider }
        );

        expect(result.success).toBe(true);
        expect(result.newStatus).toBe('CANCELLED');

        // Verify ticket cancelled
        expect(mockTx.ticket.update).toHaveBeenCalledWith({
            where: { id: 'ticket-pub-1' },
            data: { status: 'CANCELLED' },
        });

        // Verify audit log with reason
        expect(mockTx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                action: 'CUSTOMER_BUDGET_REJECTED',
                details: expect.stringContaining('Muy costoso'),
            }),
        }));

        // Verify note
        expect(mockTx.ticketNote.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                content: expect.stringContaining('Muy costoso'),
            }),
        }));
    });
});
