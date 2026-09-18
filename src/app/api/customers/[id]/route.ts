import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { UpdateCustomerSchema } from '@/lib/schemas';
import { DeleteCustomerUseCase, UpdateCustomerUseCase } from '@/use-cases/customers/CustomerUseCases';
import { toClientMessage } from '@/lib/errors';
import { hasPermission } from '@/lib/auth-utils';
import type { UserRole } from '@prisma/client';

// GET /api/customers/[id] - Get single customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getTenantPrisma(session.user.tenantId);

    const customer = await db.customer.findFirst({
      where: { id: (await params).id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        tickets: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/customers/[id] - Update customer
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user.role as UserRole, 'canEditCustomers')) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const validationResult = UpdateCustomerSchema.safeParse({
      ...body,
      customerId: id,
    });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const updatedCustomer = await UpdateCustomerUseCase.execute(
      validationResult.data,
      session.user.tenantId,
      session.user.id
    );

    return NextResponse.json(updatedCustomer);
  } catch (error: unknown) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: toClientMessage(error, 'Internal Server Error') },
      { status: error instanceof Error && error.message.includes('no encontrado') ? 404 : 500 }
    );
  }
}

// DELETE /api/customers/[id] - Delete customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user.role as UserRole, 'canDeleteCustomers')) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await DeleteCustomerUseCase.execute(id, session.user.tenantId, session.user.id);

    return NextResponse.json(
      { message: 'Customer deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: toClientMessage(error, 'Internal Server Error') },
      { status: error instanceof Error && error.message.includes('no encontrado') ? 404 : 500 }
    );
  }
}
