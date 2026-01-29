import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTicket } from './actions';
import { prisma } from './prisma';
import { auth } from '@/auth';

// Mock auth
vi.mock('@/auth', () => ({
    auth: vi.fn(),
    signIn: vi.fn(),
}));

// Mock notifications to avoid errors
vi.mock('./ticket-notifications', () => ({
    notifyTicketCreated: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    redirect: vi.fn(),
}));

describe('Enhanced Ticket Creation Flow', () => {
    let tenantId: string;
    let userId: string;

    beforeEach(async () => {
        vi.resetAllMocks();
        
        // 1. Create a real Tenant to satisfy FK constraints
        const tenant = await prisma.tenant.create({
            data: {
                name: 'Test Tenant',
                slug: `test-tenant-${Date.now()}`,
            }
        });
        tenantId = tenant.id;

        // 2. Create a real User linked to tenant (optional but good for consistency)
        const user = await prisma.user.create({
            data: {
                email: `tech-${Date.now()}@test.com`,
                password: 'hashedpassword',
                role: 'TECHNICIAN',
                tenantId: tenant.id,
                name: 'Test Tech'
            }
        });
        userId = user.id;

        // Mock auth with REAL IDs
        (auth as any).mockResolvedValue({ 
            user: {
                id: userId,
                tenantId: tenantId,
                email: user.email,
                role: user.role,
            } 
        });
    });

    afterEach(async () => {
        // Cleanup in correct order (FK constraints)
        await prisma.auditLog.deleteMany({ where: { tenantId } }); // Fix: Delete audit logs first
        await prisma.partUsage.deleteMany({ where: { ticket: { tenantId } } });
        await prisma.ticket.deleteMany({ where: { tenantId } });
        await prisma.customer.deleteMany({ where: { tenantId } });
        await prisma.part.deleteMany({ where: { tenantId } });
        await prisma.user.deleteMany({ where: { tenantId } });
        await prisma.tenant.delete({ where: { id: tenantId } });
    });

    it('should find existing customer by email instead of creating duplicate', async () => {
        // 1. Create existing customer
        await prisma.customer.create({
            data: {
                name: 'Existing Client',
                email: 'unique@client.com', // Unique email
                tenantId: tenantId,
            }
        });

        // 2. Create ticket using SAME email but DIFFERENT name (to prove lookup by email)
        const ticketData = {
            title: 'Test Ticket',
            description: 'Test Description',
            deviceType: 'PC',
        };

        const formData = new FormData();
        formData.append('title', ticketData.title);
        formData.append('description', ticketData.description);
        formData.append('deviceType', ticketData.deviceType);
        formData.append('customerName', 'Different Name');
        formData.append('customerEmail', 'unique@client.com');

        await createTicket(null, formData);

        // 3. Verify
        const customers = await prisma.customer.findMany({ where: { tenantId } });
        const tickets = await prisma.ticket.findMany({ where: { tenantId }, include: { customer: true } });

        expect(customers.length).toBe(1); // Should still be only 1 customer
        expect(tickets[0].customer.email).toBe('unique@client.com');
        expect(tickets[0].customer.name).toBe('Existing Client'); // Should keep original name
    });

    it('should consume stock when initialParts provided', async () => {
        // 1. Create Part with stock
        const part = await prisma.part.create({
            data: {
                name: 'Test Part',
                quantity: 10,
                cost: 10,
                price: 20,
                tenantId: tenantId,
            }
        });

        // 2. Create Ticket with initialParts
        const ticketData = {
            title: 'Stock Test',
            description: 'Testing stock',
            initialParts: [{ partId: part.id, quantity: 2 }]
        };

        const formData = new FormData();
        formData.append('title', ticketData.title);
        formData.append('description', ticketData.description);
        formData.append('customerName', 'Stock Client');
        formData.append('initialParts', JSON.stringify([{ partId: part.id, quantity: 2 }]));

        await createTicket(null, formData);

        // 3. Verify Stock Reduced
        const updatedPart = await prisma.part.findUnique({ where: { id: part.id } });
        expect(updatedPart?.quantity).toBe(8); // 10 - 2 = 8

        // 4. Verify Usage Record
        const usage = await prisma.partUsage.findFirst({ where: { partId: part.id } });
        expect(usage).toBeTruthy();
        expect(usage?.quantity).toBe(2);
    });

    it('should allow custom initial status and priority', async () => {
        const ticketData = {
            title: 'Custom Status Ticket',
            description: 'Desc',
            status: 'IN_PROGRESS' as const,
            priority: 'URGENT' as const,
        };

        const formData = new FormData();
        formData.append('title', ticketData.title);
        formData.append('description', ticketData.description);
        formData.append('status', 'IN_PROGRESS');
        formData.append('priority', 'URGENT');
        formData.append('customerName', 'Status Client');

        await createTicket(null, formData);

        const ticket = await prisma.ticket.findFirst({ where: { title: 'Custom Status Ticket' } });
        expect(ticket?.status).toBe('IN_PROGRESS');
        expect(ticket?.priority).toBe('URGENT');
    });
});
