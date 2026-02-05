import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Validation schema
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['ADMIN', 'MANAGER', 'TECHNICIAN', 'VIEWER']),
});

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
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
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

    // Only ADMIN can create users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can create users' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const validationResult = createUserSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email, password, name, role } = validationResult.data;

    const db = getTenantPrisma(session.user.tenantId);

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        tenantId: session.user.tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
