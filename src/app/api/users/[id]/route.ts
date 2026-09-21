import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { UpdateUserSchema } from '@/lib/schemas';
import { DeleteUserUseCase, UpdateManagedUserUseCase } from '@/use-cases/users';
import { toClientMessage } from '@/lib/errors';
import { hasPermission } from '@/lib/auth-utils';
import type { UserRole } from '@prisma/client';

// GET /api/users/[id] - Get single user
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

    const { id } = await params;
    const db = getTenantPrisma(session.user.tenantId);

    const user = await db.user.findFirst({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/users/[id] - Update user
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

    const { id } = await params;

    const body = await request.json();

    const validationResult = UpdateUserSchema.safeParse({
      ...body,
      userId: id,
    });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    const { updatedUser } = await UpdateManagedUserUseCase.execute(
      validationResult.data,
      session.user.id,
      session.user.role as UserRole,
      session.user.tenantId,
      db
    );

    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    });
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: toClientMessage(error, 'Internal Server Error') },
      { status: error instanceof Error && error.message.includes('no encontrado') ? 404 : 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user
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

    const { id } = await params;

    if (!hasPermission(session.user.role as UserRole, 'canDeleteUsers')) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      );
    }

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    await DeleteUserUseCase.execute(id, session.user.tenantId, session.user.id, db);

    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: toClientMessage(error, 'Internal Server Error') },
      { status: error instanceof Error && error.message.includes('no encontrado') ? 404 : 500 }
    );
  }
}
