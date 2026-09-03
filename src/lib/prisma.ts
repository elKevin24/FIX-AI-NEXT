import 'server-only';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const prismaClientSingleton = () => {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    console.warn('[AI Studio] DATABASE_URL is not defined — using fallback client');
    const noOp = {
      findMany: async () => [],
      findFirst: async () => null,
      findUnique: async () => null,
      create: async (d: any) => d?.data ?? {},
      createMany: async () => ({ count: 0 }),
      update: async (d: any) => d?.data ?? {},
      updateMany: async () => ({ count: 0 }),
      delete: async () => ({}),
      deleteMany: async () => ({ count: 0 }),
      count: async () => 0,
      aggregate: async () => ({}),
      groupBy: async () => [],
    };
    return new Proxy({}, {
      get: (target, prop) => {
        if (prop === '$extends' || prop === '$transaction' || prop === '$connect' || prop === '$disconnect') {
          return () => target;
        }
        return noOp;
      },
    }) as unknown as PrismaClient;
  }
  
  try {
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({ adapter });
  } catch {
    return new PrismaClient();
  }
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env['NODE_ENV'] !== 'production') globalForPrisma.prisma = prisma;
