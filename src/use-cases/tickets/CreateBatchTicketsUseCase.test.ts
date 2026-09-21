import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateBatchTicketsUseCase } from './CreateBatchTicketsUseCase';
import { CreateTicketInput } from '@/lib/schemas';

describe('CreateBatchTicketsUseCase (Dependency Injection & SOLID DIP)', () => {
    const mockCustomerResolver = {
        resolve: vi.fn(),
    };

    const mockNotifier = vi.fn().mockResolvedValue(undefined);

    const mockTx = {
        ticket: {
            create: vi.fn().mockImplementation(({ data }) =>
                Promise.resolve({ id: `ticket-${data.title}` })
            ),
        },
    };

    const mockDb = {
        $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
        ticket: {
            findMany: vi.fn().mockResolvedValue([]),
        },
    };

    const sampleTickets: CreateTicketInput[] = [
        {
            title: 'Equipo 1',
            description: 'Falla de encendido',
            status: 'OPEN',
            deviceType: 'Laptop',
        },
        {
            title: 'Equipo 2',
            description: 'Mantenimiento preventivo',
            status: 'OPEN',
            deviceType: 'Desktop',
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates batch tickets resolving customer and inserting in atomic transaction via DI', async () => {
        mockCustomerResolver.resolve.mockResolvedValueOnce({
            id: 'customer-batch-1',
            name: 'Empresa ABC',
            email: 'admin@abc.com',
        });

        const result = await CreateBatchTicketsUseCase.execute(
            {
                ticketsData: sampleTickets,
                customerInfo: { customerName: 'Empresa ABC' },
                tenantId: 'tenant-100',
                userId: 'user-200',
            },
            {
                customerResolver: mockCustomerResolver,
                db: mockDb,
                notifier: mockNotifier,
            }
        );

        expect(mockCustomerResolver.resolve).toHaveBeenCalledWith({ customerName: 'Empresa ABC' });
        expect(mockDb.$transaction).toHaveBeenCalled();
        expect(mockTx.ticket.create).toHaveBeenCalledTimes(2);
        expect(result).toEqual(['ticket-Equipo 1', 'ticket-Equipo 2']);
    });
});
