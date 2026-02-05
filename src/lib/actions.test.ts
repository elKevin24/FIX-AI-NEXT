import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createUser,
    createCustomer, updateCustomer, deleteCustomer,
    createTicket, updateTicketStatus,
    createPart, updatePart
} from './actions';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { redirect } from 'next/navigation';

// Mock dependencies
vi.mock('@/auth');
vi.mock('@/lib/tenant-prisma');
vi.mock('next/cache');
vi.mock('next/navigation', () => ({
    redirect: vi.fn(),
    notFound: vi.fn(),
}));
vi.mock('@/lib/notifications');
vi.mock('./ticket-notifications');
vi.mock('@/lib/prisma', () => ({
    prisma: {
        $transaction: vi.fn(),
    }
}));

describe('Core Actions CRUD', () => {
    const mockSession = {
        user: {
            id: 'user-1',
            tenantId: 'tenant-1',
            role: 'ADMIN',
            email: 'admin@test.com'
        },
    };

    const mockDb: any = {
        user: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            findMany: vi.fn(),
        },
        customer: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        ticket: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        part: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        ticketNote: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        auditLog: {
            create: vi.fn(),
        },
        partUsage: {
            create: vi.fn(),
        },

        $transaction: vi.fn((callback) => callback(mockDb)),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (auth as any).mockResolvedValue(mockSession);
        (getTenantPrisma as any).mockReturnValue(mockDb);
        (prisma.$transaction as any).mockImplementation((callback: any) => callback(mockDb));
    });

    // ==================== USER TESTS ====================
    describe('User Actions', () => {
        it('createUser should create a user successfully', async () => {
            mockDb.user.findFirst.mockResolvedValue(null);
            const formData = new FormData();
            formData.append('name', 'New User');
            formData.append('email', 'new@test.com');
            formData.append('password', '123456');
            formData.append('role', 'TECHNICIAN');

            const result = await createUser(null, formData);

            expect(mockDb.user.create).toHaveBeenCalled();
            expect(result).toEqual({ success: true, message: 'Usuario creado exitosamente' });
        });

        it('createUser should fail if not ADMIN', async () => {
            (auth as any).mockResolvedValue({ user: { ...mockSession.user, role: 'TECHNICIAN' } });
            const formData = new FormData();
            await expect(createUser(null, formData)).resolves.toEqual({ 
                success: false,
                message: 'Solo los administradores pueden crear usuarios' 
            });
        });
    });

    // ==================== CUSTOMER TESTS ====================
    describe('Customer Actions', () => {
        it('createCustomer should create a customer successfully', async () => {
            const formData = new FormData();
            formData.append('name', 'John Doe');
            formData.append('email', 'john@example.com');

            await createCustomer(null, formData);

            expect(mockDb.customer.create).toHaveBeenCalled();
            expect(redirect).toHaveBeenCalledWith('/dashboard/customers');
        });

        it('updateCustomer should update successfully', async () => {
            const validUuid = '123e4567-e89b-12d3-a456-426614174000';
            mockDb.customer.findUnique.mockResolvedValue({ id: validUuid, tenantId: 'tenant-1' });
            const formData = new FormData();
            formData.append('customerId', validUuid);
            formData.append('name', 'John Updated');

            await updateCustomer(null, formData);

            expect(mockDb.customer.update).toHaveBeenCalled();
            expect(redirect).toHaveBeenCalledWith('/dashboard/customers');
        });

        it('deleteCustomer should fail if customer has tickets', async () => {
            const validUuid = '123e4567-e89b-12d3-a456-426614174000';
            mockDb.customer.findUnique.mockResolvedValue({ 
                id: validUuid, 
                tenantId: 'tenant-1',
                tickets: [{ id: 't-1' }] 
            });
            const formData = new FormData();
            formData.append('customerId', validUuid);

            const result = await deleteCustomer(null, formData);
            expect(result).toEqual(expect.objectContaining({ message: expect.stringContaining('tiene 1 ticket') }));
        });
    });

    // ==================== TICKET TESTS ====================
    describe('Ticket Actions', () => {
        it('createTicket should create ticket and auto-create customer', async () => {
            mockDb.customer.findFirst.mockResolvedValue(null); // Customer not found
            mockDb.customer.create.mockResolvedValue({ id: 'cust-new', name: 'New Cust' });
            mockDb.ticket.create.mockResolvedValue({ 
                id: 'tick-1',
                ticketNumber: 'T-1',
                status: 'OPEN',
                tenantId: 'tenant-1',
                customer: { id: 'cust-new', name: 'New Cust', email: 'test@test.com' },
                assignedTo: null 
            });

            const formData = new FormData();
            formData.append('title', 'Fix PC');
            formData.append('description', 'Broken');
            formData.append('customerName', 'New Cust');
            
            await createTicket(null, formData);

            expect(mockDb.customer.create).toHaveBeenCalled();
            expect(mockDb.ticket.create).toHaveBeenCalled();
        });

        it('createTicket should use atomic updateMany for initialParts (success path)', async () => {
            mockDb.customer.findFirst.mockResolvedValue(null); // Customer not found
            mockDb.customer.create.mockResolvedValue({ id: 'cust-new', name: 'New Cust' });
            mockDb.ticket.create.mockResolvedValue({ 
                id: 'tick-2',
                ticketNumber: 'T-2',
                status: 'OPEN',
                tenantId: 'tenant-1',
                customer: { id: 'cust-new', name: 'New Cust', email: 'test@test.com' },
                assignedTo: null 
            });

            const validPartId = '123e4567-e89b-12d3-a456-426614174001';
            // Mock part existence
            mockDb.part.findUnique = vi.fn().mockResolvedValue({ id: validPartId, name: 'Part A', quantity: 4, minStock: 2, tenantId: 'tenant-1' });
            mockDb.partUsage.create = vi.fn().mockResolvedValue({ id: 'usage-1' });

            const formData = new FormData();
            formData.append('title', 'Fix PC');
            formData.append('description', 'Broken');
            formData.append('customerName', 'New Cust');
            formData.append('initialParts', JSON.stringify([{ partId: validPartId, quantity: 1 }]));

            await createTicket(null, formData);

            expect(mockDb.partUsage.create).toHaveBeenCalled();
        });

                        it('createTicket should fail when stock is insufficient', async () => {
                            const validPartId = '123e4567-e89b-12d3-a456-426614174000';
                            mockDb.customer.findFirst.mockResolvedValue(null); // Customer not found
                            mockDb.customer.create.mockResolvedValue({ id: 'cust-new', name: 'New Cust' });
                            
                            // Simulate insufficient stock check
                            // quantity 0 < 1 required
                            mockDb.part.findUnique = vi.fn().mockResolvedValue({ id: validPartId, name: 'Part A', quantity: 0, minStock: 2, tenantId: 'tenant-1' });
                
                            const formData = new FormData();
                            formData.append('title', 'Fix PC');
                            formData.append('description', 'Broken');
                            formData.append('customerName', 'New Cust');
                            formData.append('initialParts', JSON.stringify([{ partId: validPartId, quantity: 1 }]));
                
                            const result = await createTicket(null, formData);
                
                            expect(result).toEqual(expect.objectContaining({ success: false }));
                            expect(result.message).toMatch(/Stock insuficiente/);
                        });        it('updateTicketStatus should update status', async () => {
            const validTicketId = '123e4567-e89b-12d3-a456-426614174001';
            mockDb.ticket.findUnique.mockResolvedValue({ 
                id: validTicketId, 
                status: 'OPEN', 
                tenantId: 'tenant-1',
                partsUsed: [],
                customer: { id: 'c-1', name: 'C', email: 'e' },
                assignedTo: { id: 'u-1' }
            });
            
            const formData = new FormData();
            formData.append('ticketId', validTicketId);
            formData.append('status', 'IN_PROGRESS');

            await updateTicketStatus(null, formData);

            expect(mockDb.ticket.update).toHaveBeenCalledWith(
                expect.objectContaining({ 
                    where: { id: validTicketId },
                    data: expect.objectContaining({ status: 'IN_PROGRESS' })
                })
            );
        });
    });

    // ==================== PART TESTS ====================
    describe('Part Actions', () => {
        it('createPart should success', async () => {
            const formData = new FormData();
            formData.append('name', 'RAM');
            formData.append('quantity', '10');
            formData.append('cost', '50');
            formData.append('price', '80');

            await createPart(null, formData);

            expect(mockDb.part.create).toHaveBeenCalled();
            expect(redirect).toHaveBeenCalledWith('/dashboard/parts');
        });

        it('updatePart should notify low stock', async () => {
             const validPartId = '123e4567-e89b-12d3-a456-426614174002';
             mockDb.part.findUnique.mockResolvedValue({ id: validPartId, tenantId: 'tenant-1', quantity: 2, minStock: 5 });
             mockDb.part.update.mockResolvedValue({ 
                 id: validPartId, 
                 quantity: 2, 
                 minStock: 5, 
                 tenantId: 'tenant-1' 
             });
             mockDb.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

             const formData = new FormData();
             formData.append('partId', validPartId);
             formData.append('name', 'RAM');
             formData.append('quantity', '2');
             formData.append('cost', '50');
             formData.append('price', '80');

             await updatePart(null, formData);

             expect(mockDb.part.update).toHaveBeenCalled();
             expect(redirect).toHaveBeenCalledWith('/dashboard/parts');
        });
    });
});
