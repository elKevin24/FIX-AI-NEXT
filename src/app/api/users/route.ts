import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { CreateUserSchema } from '@/lib/schemas';
import { CreateManagedUserUseCase } from '@/use-cases/users';
import { toClientMessage } from '@/lib/errors';
import type { UserRole } from '@prisma/client';

// GET /api/users - List all users in tenant
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getTenantPrisma(session.user.tenantId);

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const validationResult = CreateUserSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    const result = await CreateManagedUserUseCase.execute(
      validationResult.data,
      session.user.id,
      session.user.role as UserRole,
      session.user.tenantId,
      db
    );

    return NextResponse.json(
      {
        id: result.newUser.id,
        email: result.newUser.email,
        name: result.newUser.name,
        role: result.newUser.role,
        createdAt: result.newUser.createdAt,
        temporaryPassword: result.passwordMustChange ? result.finalPassword : undefined,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: toClientMessage(error, 'Internal Server Error') },
      { status: error instanceof Error && error.message.includes('permiso') ? 403 : 500 }
    );
  }
}
