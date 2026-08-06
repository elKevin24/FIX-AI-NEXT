import { prisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/tenant-prisma';

export class TicketRepository {
  /**
   * Public lookup for ticket by UUID or short ID/number
   */
  static async findPublicByIdOrNumber(rawId: string) {
    if (typeof rawId !== 'string') return null;
    const id = rawId.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let ticket = isUuid ? await prisma.ticket.findUnique({
      where: { id },
      include: {
        tenant: true,
        assignedTo: true,
      },
    }) : null;

    if (!ticket) {
      ticket = await prisma.ticket.findFirst({
        where: {
          ticketNumber: id,
        },
        include: {
          tenant: true,
          assignedTo: true,
        },
      });
    }

    return ticket;
  }

  /**
   * Get isolated tenant Prisma client
   */
  static getTenantDb(tenantId: string, userId: string) {
    return getTenantPrisma(tenantId, userId);
  }
}
