import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// Define types locally since they may not be exported yet
enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_PARTS = 'WAITING_FOR_PARTS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

/**
 * @swagger
 * /api/tickets/pool:
 *   get:
 *     summary: Get available tickets pool (unassigned or OPEN tickets)
 *     tags: [Tickets]
 *     parameters:
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *     responses:
 *       200:
 *         description: Tickets pool retrieved successfully
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const priority = searchParams.get('priority') as TicketPriority | null;
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get current technician's info if they're a technician
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        specializations: true,
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
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if technician can take more tickets
    const canTakeMore =
      currentUser._count.assignedTickets < currentUser.maxConcurrentTickets;
    const availableSlots =
      currentUser.maxConcurrentTickets - currentUser._count.assignedTickets;

    // Get tickets from pool (unassigned OPEN tickets)
    const tickets = await prisma.ticket.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: TicketStatus.OPEN,
        assignedToId: null,
        ...(priority && { priority }),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' }, // URGENT first
        { createdAt: 'asc' }, // Older tickets first
      ],
      take: limit,
    });

    // Calculate age in hours for each ticket
    const now = new Date();
    const ticketsWithAge = tickets.map((ticket: any) => {
      const ageInHours = Math.floor(
        (now.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60)
      );
      return {
        ...ticket,
        ageInHours,
        isOld: ageInHours > 24,
        isVeryOld: ageInHours > 48,
      };
    });

    // Get pool statistics
    const poolStats = await prisma.ticket.groupBy({
      by: ['priority'],
      where: {
        tenantId: session.user.tenantId,
        status: TicketStatus.OPEN,
        assignedToId: null,
      },
      _count: true,
    });

    const stats = {
      total: poolStats.reduce((acc: number, stat: any) => acc + stat._count, 0),
      byPriority: {
        URGENT: poolStats.find((s: any) => s.priority === 'URGENT')?._count || 0,
        HIGH: poolStats.find((s: any) => s.priority === 'HIGH')?._count || 0,
        MEDIUM: poolStats.find((s: any) => s.priority === 'MEDIUM')?._count || 0,
        LOW: poolStats.find((s: any) => s.priority === 'LOW')?._count || 0,
      },
    };

    return NextResponse.json({
      tickets: ticketsWithAge,
      stats,
      technician: {
        id: currentUser.id,
        name: currentUser.name,
        currentWorkload: currentUser._count.assignedTickets,
        maxConcurrentTickets: currentUser.maxConcurrentTickets,
        availableSlots,
        canTakeMore,
        status: currentUser.status,
        specializations: currentUser.specializations.map(
          (s: any) => s.specialization
        ),
      },
    });
  } catch (error) {
    console.error('Error fetching tickets pool:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
