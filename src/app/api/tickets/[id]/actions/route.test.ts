import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@/auth');
vi.mock('@/lib/tenant-prisma');
vi.mock('@/lib/auth-utils', () => ({
  requireTicketActionPermission: vi.fn(),
  AuthorizationError: class extends Error { code = 'FORBIDDEN' },
}));
vi.mock('@/lib/ticket-notifications');
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, init, status: init?.status || 200 })),
  },
}));

describe('Ticket Actions API', () => {
  const mockSession = {
    user: { id: 'tech-1', tenantId: 'tenant-1', role: 'TECHNICIAN' },
  };

  const mockDb: any = {
    ticket: { findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn((callback) => callback(mockTx)),
  };

  const mockTx: any = {
    user: { findUnique: vi.fn() },
    ticket: { findUnique: vi.fn(), update: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue(mockSession);
    (getTenantPrisma as any).mockReturnValue(mockDb);
  });

  const createReq = (body: any) => ({
    json: async () => body,
  } as any);

  describe('POST take action', () => {
    it('should allow technician to take a ticket within workload limit', async () => {
      const ticketId = 'tick-1';
      const ticket = { id: ticketId, tenantId: 'tenant-1', status: 'OPEN', assignedToId: null };
      
      mockDb.ticket.findUnique.mockResolvedValue({
        ...ticket,
        customer: { id: 'c1', name: 'Cust' },
        assignedTo: null
      });

      mockTx.user.findUnique.mockResolvedValue({
        id: 'tech-1',
        status: 'AVAILABLE',
        maxConcurrentTickets: 3,
        _count: { assignedTickets: 1 } // Already has 1 ticket
      });

      mockTx.ticket.findUnique.mockResolvedValue(ticket);
      const updatedTicket = { 
        ...ticket, 
        assignedToId: 'tech-1', 
        status: 'IN_PROGRESS',
        customer: { id: 'c1', name: 'Cust', email: 'cust@test.com' },
        assignedTo: { id: 'tech-1', name: 'Tech' }
      };
      mockTx.ticket.update.mockResolvedValue(updatedTicket);

      const res = await POST(createReq({ action: 'take' }), { params: Promise.resolve({ id: ticketId }) });

      expect(res.status).toBe(200);
      expect(mockTx.ticket.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ assignedToId: 'tech-1' })
      }));
    });

    it('should block taking ticket if workload limit is reached', async () => {
      const ticketId = 'tick-1';
      mockDb.ticket.findUnique.mockResolvedValue({ id: ticketId, tenantId: 'tenant-1', assignedToId: null });

      mockTx.user.findUnique.mockResolvedValue({
        id: 'tech-1',
        status: 'AVAILABLE',
        maxConcurrentTickets: 2,
        _count: { assignedTickets: 2 } // Limit reached
      });

      const res = await POST(createReq({ action: 'take' }), { params: Promise.resolve({ id: ticketId }) });

      expect(res.status).toBe(400);
      expect((res as any).data.error).toMatch(/Workload limit reached/);
    });

    it('should block taking ticket if already assigned (race condition check)', async () => {
      const ticketId = 'tick-1';
      mockDb.ticket.findUnique.mockResolvedValue({ id: ticketId, tenantId: 'tenant-1', assignedToId: null });

      mockTx.user.findUnique.mockResolvedValue({
        id: 'tech-1',
        status: 'AVAILABLE',
        maxConcurrentTickets: 5,
        _count: { assignedTickets: 0 }
      });

      // Simulation: ticket was just assigned to someone else between step 1 and step 2
      mockTx.ticket.findUnique.mockResolvedValue({ id: ticketId, assignedToId: 'other-tech' });

      const res = await POST(createReq({ action: 'take' }), { params: Promise.resolve({ id: ticketId }) });

      expect(res.status).toBe(400);
      expect((res as any).data.error).toBe('Ticket is already assigned to another technician');
    });

    it('should handle database errors and return 400', async () => {
      const ticketId = 'tick-1';
      mockDb.ticket.findUnique.mockResolvedValue({ id: ticketId, tenantId: 'tenant-1' });
      mockDb.$transaction.mockRejectedValue(new Error('DB connection failed'));

      const res = await POST(createReq({ action: 'take' }), { params: Promise.resolve({ id: ticketId }) });

      expect(res.status).toBe(400);
      expect((res as any).data.error).toBe('DB connection failed');
    });
  });
});
