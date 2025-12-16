import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { TechnicianStatus } from '@prisma/client';

/**
 * @swagger
 * /api/technicians/{id}/availability:
 *   get:
 *     summary: Get technician availability and unavailability periods
 *     tags: [Technicians]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Technician availability retrieved successfully
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const technician = await prisma.user.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
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
        unavailabilities: {
          where: {
            isActive: true,
          },
          orderBy: {
            startDate: 'asc',
          },
        },
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: {
                  in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_PARTS'],
                },
              },
            },
          },
        },
      },
    });

    if (!technician) {
      return NextResponse.json(
        { error: 'Technician not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...technician,
      currentWorkload: technician._count.assignedTickets,
      availableSlots: Math.max(
        0,
        technician.maxConcurrentTickets - technician._count.assignedTickets
      ),
    });
  } catch (error) {
    console.error('Error fetching technician availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/technicians/{id}/availability:
 *   patch:
 *     summary: Update technician availability status
 *     tags: [Technicians]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [AVAILABLE, UNAVAILABLE, ON_VACATION, ON_LEAVE, IN_TRAINING, SICK_LEAVE]
 *               statusReason:
 *                 type: string
 *               maxConcurrentTickets:
 *                 type: number
 *     responses:
 *       200:
 *         description: Availability updated successfully
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, statusReason, maxConcurrentTickets } = body;

    // Verify technician exists and belongs to tenant
    const technician = await prisma.user.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!technician) {
      return NextResponse.json(
        { error: 'Technician not found' },
        { status: 404 }
      );
    }

    // Update availability
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(status && { status: status as TechnicianStatus }),
        ...(statusReason !== undefined && { statusReason }),
        ...(maxConcurrentTickets !== undefined && { maxConcurrentTickets }),
      },
      select: {
        id: true,
        name: true,
        status: true,
        maxConcurrentTickets: true,
        statusReason: true,
        availableFrom: true,
        availableUntil: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_TECHNICIAN_AVAILABILITY',
        details: `Updated availability for ${technician.name}: ${status}`,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating technician availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/technicians/{id}/availability:
 *   post:
 *     summary: Add unavailability period for technician
 *     tags: [Technicians]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [startDate, endDate, reason]
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               reason:
 *                 type: string
 *                 enum: [UNAVAILABLE, ON_VACATION, ON_LEAVE, IN_TRAINING, SICK_LEAVE]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Unavailability period created successfully
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { startDate, endDate, reason, notes } = body;

    if (!startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: 'startDate, endDate, and reason are required' },
        { status: 400 }
      );
    }

    // Verify technician exists and belongs to tenant
    const technician = await prisma.user.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!technician) {
      return NextResponse.json(
        { error: 'Technician not found' },
        { status: 404 }
      );
    }

    // Create unavailability period
    const unavailability = await prisma.technicianUnavailability.create({
      data: {
        userId: id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason as TechnicianStatus,
        notes,
      },
    });

    // Update technician status if period starts now
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start <= now && end >= now) {
      await prisma.user.update({
        where: { id },
        data: {
          status: reason as TechnicianStatus,
          statusReason: notes,
          availableFrom: end,
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_TECHNICIAN_UNAVAILABILITY',
        details: `Created unavailability period for ${technician.name}: ${reason} from ${startDate} to ${endDate}`,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
    });

    return NextResponse.json(unavailability, { status: 201 });
  } catch (error) {
    console.error('Error creating unavailability period:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
