import { Prisma, PrismaClient } from '@prisma/client';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTenantPrisma } from '@/lib/tenant-prisma';

const HAS_REAL_DB = Boolean(process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost'));

describe.skipIf(!HAS_REAL_DB)('Neon Postgres Integration - Real Concurrency Safety', () => {
  let prisma: PrismaClient;
  let testPartId: string;
  const tenantId = 'test-concurrency-tenant';
  const userId = '11111111-1111-1111-1111-111111111111';

  beforeAll(async () => {
    prisma = new PrismaClient();

    const created = await prisma.part.create({
      data: {
        name: 'Test Part - Concurrency',
        sku: `CONC-${Date.now()}`,
        quantity: 1,
        cost: new Prisma.Decimal('10.00'),
        price: new Prisma.Decimal('15.00'),
        tenantId,
        createdById: userId,
        updatedById: userId,
        minStock: 0,
      },
    });

    testPartId = created.id;
  });

  afterAll(async () => {
    try {
      await prisma.part.deleteMany({
        where: {
          id: testPartId,
          tenantId,
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  it('should never allow more than one concurrent worker to consume the last unit under SERIALIZABLE isolation', async () => {
    const tenantDb = getTenantPrisma(tenantId, userId);

    const workers = Array.from({ length: 10 }, (_, index) => index);

    const results = await Promise.all(
      workers.map(async () => {
        try {
          const result = await tenantDb.$transaction(
            async (tx) => {
              const current = await tx.part.findFirst({
                where: { id: testPartId, tenantId },
              });

              if (!current || current.quantity < 1) {
                throw new Error('Stock insuficiente');
              }

              const updated = await tx.part.update({
                where: { id: testPartId },
                data: { quantity: { decrement: 1 } },
              });

              return { count: 1, updated };
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
          );

          return { ok: true, data: result };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'unknown error';
          return {
            ok: false,
            error: message,
            isSerializationError:
              message.toLowerCase().includes('could not serialize access') ||
              message.toLowerCase().includes('deadlock') ||
              message.toLowerCase().includes('serializable'),
          };
        }
      }),
    );

    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok);

    expect(successes).toHaveLength(1);
    expect(successes[0]?.data.count).toBe(1);
    expect(failures.length).toBe(9);

    const finalPart = await tenantDb.part.findFirst({
      where: { id: testPartId, tenantId },
    });

    expect(finalPart?.quantity).toBe(0);
    expect(failures.every((failure) => failure.isSerializationError || failure.error.includes('Stock insuficiente'))).toBe(true);
  });
});
