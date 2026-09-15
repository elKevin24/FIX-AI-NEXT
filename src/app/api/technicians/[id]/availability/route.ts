import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { logAction } from '@/lib/audit-actions';
import { AuditModule, TechnicianStatus } from '@/generated/prisma';

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

    await logAction('USER_UPDATED', 'USERS', {
        entityType: 'User',
        entityId: id,
        metadata: {
            action: 'UPDATE_AVAILABILITY',
            status,
            statusReason,
            maxConcurrentTickets
        },
        tenantId: session.user.tenantId,
        userId: session.user.id
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

    const unavailability = await prisma.technicianUnavailability.create({
      data: {
        userId: id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason as TechnicianStatus,
        notes,
      },
    });

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

    await logAction('USER_UPDATED', 'USERS', {
        entityType: 'User',
        entityId: id,
        metadata: {
            action: 'CREATE_UNAVAILABILITY',
            startDate,
            endDate,
            reason,
            notes
        },
        tenantId: session.user.tenantId,
        userId: session.user.id
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