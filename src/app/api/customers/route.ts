import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { z } from 'zod';

// Validation schema
const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  dpi: z.string().optional(),
  nit: z.string().optional(),
});

// GET /api/customers - List all customers in tenant
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();

    const db = getTenantPrisma(session.user.tenantId);

    try {
      let customers;

      if (search) {
        // Use raw query for accent-insensitive search (requires unaccent extension)
        const searchPattern = `%${search}%`;
        const tenantId = session.user.tenantId;

        customers = await db.$queryRaw`
          SELECT id, name, email, phone, address, dpi, nit, "createdAt"
          FROM "customers"
          WHERE "tenantId" = ${tenantId}
          AND (
            unaccent(name) ILIKE unaccent(${searchPattern}) OR
            unaccent(email) ILIKE unaccent(${searchPattern}) OR
            unaccent(phone) ILIKE unaccent(${searchPattern}) OR
            unaccent(dpi) ILIKE unaccent(${searchPattern}) OR
            unaccent(nit) ILIKE unaccent(${searchPattern})
          )
          ORDER BY "createdAt" DESC
          LIMIT 20;
        `;
        console.log('[API Search] Raw query results:', { search, count: Array.isArray(customers) ? customers.length : 0 }); // DEBUG: Log results safely
      } else {
        // Fallback to standard Prisma for list without search (preserves relations easily)
        customers = await db.customer.findMany({
          where: { tenantId: session.user.tenantId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            dpi: true,
            nit: true,
            createdAt: true,
            _count: { select: { tickets: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });
      }

      return NextResponse.json(customers);
    } catch (error) {
      // Fallback to standard prisma if raw fails (e.g. unaccent not available)
      const where: any = {};
      if (search) {
         // Simple split search fallback
         const terms = search.split(/\s+/).filter(t => t.length > 0);
         if (terms.length > 0) {
            where.AND = terms.map(term => ({
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } },
                { phone: { contains: term, mode: 'insensitive' } },
                { dpi: { contains: term, mode: 'insensitive' } },
                { nit: { contains: term, mode: 'insensitive' } },
              ],
            }));
         }
      }
      const customers = await db.customer.findMany({
        where,
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            dpi: true,
            nit: true,
            createdAt: true,
            _count: { select: { tickets: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      return NextResponse.json(customers);
    }
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

// POST /api/customers - Create new customer
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

    // Validate input
    const validationResult = createCustomerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, email, phone, address, dpi, nit } = validationResult.data;

    const db = getTenantPrisma(session.user.tenantId);

    // Create customer
    const newCustomer = await db.customer.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        dpi: dpi || null,
        nit: nit || null,
        tenantId: session.user.tenantId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newCustomer, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}
