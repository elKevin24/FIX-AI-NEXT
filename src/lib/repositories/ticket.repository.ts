import { prisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/tenant-prisma';

export class TicketRepository {
  /**
   * Public lookup for ticket by UUID or short ID/number with customer verification check
   */
  static async findPublicByIdOrNumber(rawId: string, verification?: string) {
    if (typeof rawId !== 'string') return null;
    const id = rawId.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const whereClause = isUuid ? { id } : { ticketNumber: id };

    const ticket = await prisma.ticket.findFirst({
      where: whereClause,
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        deviceType: true,
        deviceModel: true,
        serialNumber: true,
        accessories: true,
        checkInNotes: true,
        createdAt: true,
        updatedAt: true,
        approvalToken: true,
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!ticket) return null;

    if (verification && verification.trim().length > 0) {
      const cleanVerify = verification.trim().toLowerCase();
      const customerEmail = ticket.customer?.email?.toLowerCase() || '';
      const customerPhone = ticket.customer?.phone?.replace(/\D/g, '') || '';
      const cleanDigits = cleanVerify.replace(/\D/g, '');
      const isTokenMatch = ticket.approvalToken && ticket.approvalToken === verification.trim();

      const emailMatches = Boolean(customerEmail && customerEmail === cleanVerify);
      const phoneMatches = Boolean(customerPhone && cleanDigits && (customerPhone.endsWith(cleanDigits) || customerPhone === cleanDigits));

      if (!emailMatches && !phoneMatches && !isTokenMatch) {
        return null;
      }
    }

    // Exclude internal customer contact and token from public response
    const { customer: _customer, approvalToken: _approvalToken, ...safeTicket } = ticket;
    return safeTicket;
  }

  /**
   * Get isolated tenant Prisma client
   */
  static getTenantDb(tenantId: string, userId: string) {
    return getTenantPrisma(tenantId, userId);
  }
}
