import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, TicketStatus } from '@prisma/client';

/**
 * @swagger
 * /api/technicians/workload:
 *   get:
 *     summary: Get workload overview for all technicians
 *     tags: [Technicians]
 *     responses:
 *       200:
 *         description: Workload overview retrieved successfully
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all technicians in the tenant
    const technicians = await prisma.user.findMany({
      where: {
        tenantId: session.user.tenantId,
        role: UserRole.TECHNICIAN,
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        maxConcurrentTickets: true,
        statusReason: true,
        availableFrom: true,
        availableUntil: true,
        specializations: {
          select: {
            specialization: true,
          },
        },
        assignedTickets: {
          where: {
            status: {
              in: [
                TicketStatus.OPEN,
                TicketStatus.IN_PROGRESS,
                TicketStatus.WAITING_FOR_PARTS,
              ],
            },
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            priority: 'desc',
          },
        },
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: {
                  in: [
                    TicketStatus.OPEN,
                    TicketStatus.IN_PROGRESS,
                    TicketStatus.WAITING_FOR_PARTS,
                  ],
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Calculate workload metrics for each technician
    const techniciansWithMetrics = technicians.map((tech) => {
      const currentWorkload = tech._count.assignedTickets;
      const availableSlots = Math.max(
        0,
        tech.maxConcurrentTickets - currentWorkload
      );
      const utilizationPercent =
        tech.maxConcurrentTickets > 0
          ? Math.round((currentWorkload / tech.maxConcurrentTickets) * 100)
          : 0;

      const ticketsByStatus = {
        OPEN: tech.assignedTickets.filter((t) => t.status === 'OPEN').length,
        IN_PROGRESS: tech.assignedTickets.filter(
          (t) => t.status === 'IN_PROGRESS'
        ).length,
        WAITING_FOR_PARTS: tech.assignedTickets.filter(
          (t) => t.status === 'WAITING_FOR_PARTS'
        ).length,
      };

      const ticketsByPriority = {
        URGENT: tech.assignedTickets.filter((t) => t.priority === 'URGENT')
          .length,
        HIGH: tech.assignedTickets.filter((t) => t.priority === 'HIGH').length,
        MEDIUM: tech.assignedTickets.filter((t) => t.priority === 'MEDIUM')
          .length,
        LOW: tech.assignedTickets.filter((t) => t.priority === 'LOW').length,
      };

      return {
        id: tech.id,
        name: tech.name,
        email: tech.email,
        status: tech.status,
        statusReason: tech.statusReason,
        availableFrom: tech.availableFrom,
        availableUntil: tech.availableUntil,
        specializations: tech.specializations.map((s) => s.specialization),
        maxConcurrentTickets: tech.maxConcurrentTickets,
        currentWorkload,
        availableSlots,
        utilizationPercent,
        isAvailable: tech.status === 'AVAILABLE' && availableSlots > 0,
        isFull: currentWorkload >= tech.maxConcurrentTickets,
        ticketsByStatus,
        ticketsByPriority,
        tickets: tech.assignedTickets,
      };
    });

    // Calculate overall statistics
    const totalTechnicians = techniciansWithMetrics.length;
    const availableTechnicians = techniciansWithMetrics.filter(
      (t) => t.isAvailable
    ).length;
    const fullyBookedTechnicians = techniciansWithMetrics.filter(
      (t) => t.isFull
    ).length;
    const unavailableTechnicians = techniciansWithMetrics.filter(
      (t) => t.status !== 'AVAILABLE'
    ).length;

    const totalCapacity = techniciansWithMetrics.reduce(
      (acc, t) => acc + t.maxConcurrentTickets,
      0
    );
    const totalAssigned = techniciansWithMetrics.reduce(
      (acc, t) => acc + t.currentWorkload,
      0
    );
    const totalAvailableSlots = techniciansWithMetrics.reduce(
      (acc, t) => acc + t.availableSlots,
      0
    );

    const overallUtilization =
      totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0;

    // Get unassigned tickets count
    const unassignedCount = await prisma.ticket.count({
      where: {
        tenantId: session.user.tenantId,
        status: TicketStatus.OPEN,
        assignedToId: null,
      },
    });

    const unassignedOldCount = await prisma.ticket.count({
      where: {
        tenantId: session.user.tenantId,
        status: TicketStatus.OPEN,
        assignedToId: null,
        createdAt: {
          lt: new Date(Date.now() - 48 * 60 * 60 * 1000), // Older than 48 hours
        },
      },
    });

    return NextResponse.json({
      technicians: techniciansWithMetrics,
      summary: {
        totalTechnicians,
        availableTechnicians,
        fullyBookedTechnicians,
        unavailableTechnicians,
        totalCapacity,
        totalAssigned,
        totalAvailableSlots,
        overallUtilization,
        unassignedTickets: unassignedCount,
        unassignedOldTickets: unassignedOldCount,
      },
    });
  } catch (error) {
    console.error('Error fetching technician workload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
