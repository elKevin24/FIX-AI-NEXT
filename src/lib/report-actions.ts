'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { TicketStatus } from '@prisma/client';

export async function getReportData(startDate?: Date, endDate?: Date) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);
  const tenantId = session.user.tenantId;

  const dateFilter = startDate && endDate ? {
    createdAt: {
      gte: startDate,
      lte: endDate,
    }
  } : {};

  const [
    ticketsByStatus,
    technicianStats,
    financialTickets,
    inventoryStats
  ] = await Promise.all([
    // 1. Tickets by Status
    db.ticket.groupBy({
      by: ['status'],
      _count: { id: true },
      where: dateFilter
    }),

    // 2. Technician Performance
    db.user.findMany({
      where: {
        tenantId,
        role: { in: ['TECHNICIAN', 'ADMIN'] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        assignedTickets: {
          where: dateFilter,
          select: {
            status: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    }),

    // 3. Financial Summary
    db.ticket.findMany({
      where: {
        ...dateFilter,
        status: { in: ['RESOLVED', 'CLOSED'] }
      },
      include: {
        services: true,
        partsUsed: {
          include: {
            part: {
              select: { price: true, cost: true }
            }
          }
        }
      }
    }),

    // 4. Inventory Stats
    db.part.findMany({
        where: { tenantId }
    })
  ]);

  // Transform Data
  const technicianMetrics = technicianStats.map((tech: any) => {
    const closed = tech.assignedTickets.filter((t: any) => 
      t.status === 'RESOLVED' || t.status === 'CLOSED'
    ).length;
    
    const active = tech.assignedTickets.filter((t: any) => 
      t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'WAITING_FOR_PARTS'
    ).length;

    return {
      name: tech.name || tech.email,
      closed,
      active,
      total: tech.assignedTickets.length
    };
  });

  // Calculate Revenue and Costs
  let totalLaborRevenue = 0;
  let totalPartsRevenue = 0;
  let totalPartsCost = 0;

  financialTickets.forEach((ticket: any) => {
    // Labor from services
    ticket.services.forEach((service: any) => {
      totalLaborRevenue += Number(service.laborCost || 0);
    });

    // Parts revenue and cost
    ticket.partsUsed.forEach((usage: any) => {
      totalPartsRevenue += Number(usage.part.price || 0) * usage.quantity;
      totalPartsCost += Number(usage.part.cost || 0) * usage.quantity;
    });
  });

  const lowStockParts = inventoryStats.filter((p: any) => p.quantity <= p.minStock).length;
  const totalStockValue = inventoryStats.reduce((sum: number, p: any) => sum + (Number(p.cost) * p.quantity), 0);

  return {
    ticketsByStatus: ticketsByStatus.map((s: any) => ({
      status: s.status,
      count: s._count.id
    })),
    technicianMetrics,
    finances: {
        totalLaborRevenue,
        totalPartsRevenue,
        totalPartsCost,
        netProfit: (totalLaborRevenue + totalPartsRevenue) - totalPartsCost
    },
    inventory: {
        totalItems: inventoryStats.length,
        lowStockParts,
        totalStockValue
    }
  };
}
