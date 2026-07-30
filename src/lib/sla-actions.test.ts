import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkSLA } from './sla-actions';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email-service';
import { createNotification } from '@/lib/notifications';
import { ZodError } from 'zod';

vi.mock('@/lib/prisma', () => ({
    prisma: {
        tenant: { findMany: vi.fn() },
        ticket: { findMany: vi.fn() }
    }
}));
vi.mock('@/lib/email-service', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn() }));

describe('sla-actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('lanza ZodError si tenantId no es un UUID válido', async () => {
        await expect(checkSLA('invalid-id')).rejects.toThrow(ZodError);
    });

    it('checkSLA procesa tickets CRITICAL y envía correos/notificaciones', async () => {
        const tenantMock = {
            id: 'b6f4c3a2-d9e1-4567-b890-a2b3c4d5e6f7',
            settings: {
                slaWarningPercent: 80,
                slaCriticalPercent: 100,
                slaEmailEnabled: true,
                slaInAppEnabled: true
            }
        };

        const now = new Date();
        const past = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3); // 3 days ago
        const overDue = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day overdue

        const ticketMock = {
            id: 'ticket-1',
            tenantId: tenantMock.id,
            status: 'OPEN',
            createdAt: past,
            dueDate: overDue, // Already past, so % used > 100% -> CRITICAL
            title: 'Test Ticket',
            assignedTo: { id: 'tech-1', email: 'tech@test.com' }
        };

        (prisma.tenant.findMany as any).mockResolvedValue([tenantMock]);
        (prisma.ticket.findMany as any).mockResolvedValue([ticketMock]);

        const result = await checkSLA();

        expect(result.checksRun).toBe(1);
        expect(result.notificationsSent).toBe(1);
        expect(result.emailsSent).toBe(1);

        expect(sendEmail).toHaveBeenCalled();
        expect(createNotification).toHaveBeenCalled();
    });
});
