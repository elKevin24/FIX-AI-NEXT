'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { InvoiceStatus, POSSaleStatus } from '@/generated/prisma';

export async function getReportData(startDate?: Date, endDate?: Date) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);
  const tenantId = session.user.tenantId;

  // Default to last 30 days if not provided
  const end = endDate || new Date();
  const start = startDate || new Date(new Date().setDate(end.getDate() - 30));

  const dateFilter = {
    gte: start,
    lte: end,
  };

  const [
    ticketsByStatus,
    technicianStats,
    invoiceAgg,
    posAgg,
    invoiceHistory,
    posHistory,
    inventoryStats,
    topParts
  ] = await Promise.all([
    // 1. Tickets by Status
    db.ticket.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { createdAt: dateFilter }
    }),

    // 2. Technician Performance
    db.user.findMany({
      where: {
        tenantId,
        role: { in: ['TECHNICIAN', 'ADMIN'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        assignedTickets: {
          where: { createdAt: dateFilter },
          select: {
            status: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    }),

    // 3. Financials: Invoices Aggregation
    db.invoice.aggregate({
      _sum: { total: true, laborCost: true, partsCost: true },
      where: {
        tenantId,
        status: { not: InvoiceStatus.CANCELLED },
        issuedAt: dateFilter
      }
    }),

    // 4. Financials: POS Sales Aggregation
    db.pOSSale.aggregate({
      _sum: { total: true },
      where: {
        tenantId,
        status: POSSaleStatus.COMPLETED,
        createdAt: dateFilter
      }
    }),

    // 5. Invoice History (Optimized)
    db.invoice.findMany({
      where: {
        tenantId,
        status: { not: InvoiceStatus.CANCELLED },
        issuedAt: dateFilter
      },
      select: { total: true, issuedAt: true }
    }),

    // 6. POS History (Optimized)
    db.pOSSale.findMany({
      where: {
        tenantId,
        status: POSSaleStatus.COMPLETED,
        createdAt: dateFilter
      },
      select: { total: true, createdAt: true }
    }),

    // 7. Inventory Stats
    db.part.aggregate({
        _count: { id: true },
        _sum: { quantity: true },
        where: { tenantId }
    }),

    // 8. Top Selling Parts
    db.pOSSaleItem.groupBy({
        by: ['partName'],
        _sum: { quantity: true, total: true },
        where: {
            sale: {
                tenantId,
                status: POSSaleStatus.COMPLETED,
                createdAt: dateFilter
            }
        },
        orderBy: {
            _sum: { total: 'desc' }
        },
        take: 5
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

  // Calculate Revenue from Aggregations
  const totalInvoiceRevenue = Number(invoiceAgg._sum.total || 0);
  const totalPOSRevenue = Number(posAgg._sum.total || 0);
  const totalLaborRevenue = Number(invoiceAgg._sum.laborCost || 0);
  const totalPartsRevenue = Number(invoiceAgg._sum.partsCost || 0) + totalPOSRevenue; 
  
  // Historical Data for Charts (Group by Day)
  const historyMap = new Map<string, { date: string, invoice: number, pos: number }>();
  
  const addToHistory = (date: Date, type: 'invoice' | 'pos', amount: number) => {
      const key = date.toISOString().split('T')[0];
      if (!historyMap.has(key)) {
          historyMap.set(key, { date: key, invoice: 0, pos: 0 });
      }
      const entry = historyMap.get(key)!;
      entry[type] += amount;
  };

  invoiceHistory.forEach((inv: any) => addToHistory(inv.issuedAt, 'invoice', Number(inv.total)));
  posHistory.forEach((sale: any) => addToHistory(sale.createdAt, 'pos', Number(sale.total)));

  const revenueHistory = Array.from(historyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  return {
    ticketsByStatus: ticketsByStatus.map((s: any) => ({
      status: s.status,
      count: s._count.id
    })),
    technicianMetrics,
    finances: {
        totalRevenue: totalInvoiceRevenue + totalPOSRevenue,
        invoiceRevenue: totalInvoiceRevenue,
        posRevenue: totalPOSRevenue,
        totalLaborRevenue,
        totalPartsRevenue,
        history: revenueHistory
    },
    inventory: {
        totalItems: inventoryStats._count.id,
        totalQuantity: inventoryStats._sum.quantity || 0,
        lowStockParts: 0, // Removed detailed low stock count for performance, use aggregate if needed
        totalStockValue: 0, // Need cost aggregation if we want this, skipped for perf optimization
        topSelling: topParts.map((p: any) => ({
            name: p.partName,
            quantity: p._sum.quantity,
            total: Number(p._sum.total)
        }))
    }
  };
}