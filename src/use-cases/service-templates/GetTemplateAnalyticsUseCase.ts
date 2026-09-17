import { ServiceCategory } from '@prisma/client';
import type { TenantPrismaClient, TemplateAnalytics } from './types';

export class GetTemplateAnalyticsUseCase {
  static async execute(
    startDate: Date | undefined,
    endDate: Date | undefined,
    db: TenantPrismaClient
  ): Promise<TemplateAnalytics> {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all templates with ticket counts
    const templates = await db.serviceTemplate.findMany({
      include: {
        tickets: {
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
          select: {
            id: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    // Get recent tickets created from templates
    const recentTickets = await db.ticket.findMany({
      where: {
        serviceTemplateId: { not: null },
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        serviceTemplate: {
          select: {
            name: true,
            icon: true,
          },
        },
        customer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // Calculate summary
    const activeTemplates = templates.filter((t: typeof templates[0]) => t.isActive);
    const totalTicketsFromTemplates = templates.reduce((sum: number, t: typeof templates[0]) => sum + t.tickets.length, 0);
    const totalRevenue = templates.reduce((sum: number, t: typeof templates[0]) => {
      const laborCost = t.laborCost ? Number(t.laborCost) : 0;
      return sum + (laborCost * t.tickets.length);
    }, 0);

    // Template usage stats
    const templateUsage = templates.map((t: typeof templates[0]) => {
      const ticketDates = t.tickets.map((ticket: { id: string; createdAt: Date }) => ticket.createdAt);
      const lastUsed = ticketDates.length > 0
        ? new Date(Math.max(...ticketDates.map((d: Date) => d.getTime())))
        : null;

      const laborCost = t.laborCost ? Number(t.laborCost) : 0;

      return {
        id: t.id,
        name: t.name,
        category: t.category,
        icon: t.icon,
        color: t.color,
        ticketCount: t.tickets.length,
        lastUsed,
        laborCost,
        totalRevenue: laborCost * t.tickets.length,
      };
    }).sort((a: { ticketCount: number }, b: { ticketCount: number }) => b.ticketCount - a.ticketCount);

    // Category breakdown
    const categoryMap = new Map<ServiceCategory, { count: number; ticketCount: number; revenue: number }>();
    for (const t of templates) {
      const existing = categoryMap.get(t.category) || { count: 0, ticketCount: 0, revenue: 0 };
      const laborCost = t.laborCost ? Number(t.laborCost) : 0;
      categoryMap.set(t.category, {
        count: existing.count + 1,
        ticketCount: existing.ticketCount + t.tickets.length,
        revenue: existing.revenue + (laborCost * t.tickets.length),
      });
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      ...data,
    })).sort((a, b) => b.ticketCount - a.ticketCount);

    // Recent activity
    const recentActivity = recentTickets.map((t: typeof recentTickets[0]) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      title: t.title,
      templateName: t.serviceTemplate?.name || 'Sin plantilla',
      templateIcon: t.serviceTemplate?.icon || null,
      customerName: t.customer.name,
      createdAt: t.createdAt,
      status: t.status,
    }));

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const allTicketsWithTemplates = await db.ticket.findMany({
      where: {
        serviceTemplateId: { not: null },
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      include: {
        serviceTemplate: {
          select: {
            laborCost: true,
          },
        },
      },
    });

    const monthlyMap = new Map<string, { ticketCount: number; revenue: number }>();
    for (const ticket of allTicketsWithTemplates) {
      const monthKey = ticket.createdAt.toISOString().slice(0, 7); // YYYY-MM
      const existing = monthlyMap.get(monthKey) || { ticketCount: 0, revenue: 0 };
      const laborCost = ticket.serviceTemplate?.laborCost ? Number(ticket.serviceTemplate.laborCost) : 0;
      monthlyMap.set(monthKey, {
        ticketCount: existing.ticketCount + 1,
        revenue: existing.revenue + laborCost,
      });
    }

    const monthlyTrend = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      summary: {
        totalTemplates: templates.length,
        activeTemplates: activeTemplates.length,
        totalTicketsCreated: totalTicketsFromTemplates,
        totalRevenueFromTemplates: totalRevenue,
      },
      templateUsage,
      categoryBreakdown,
      recentActivity,
      monthlyTrend,
    };
  }
}
