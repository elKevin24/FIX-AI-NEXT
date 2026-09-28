import 'server-only';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

function createFallbackClient(): PrismaClient {
  console.warn('[AI Studio] DATABASE_URL is not defined or unreachable — using fallback client');
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

  const fallbackClient: any = new Proxy({}, {
    get: (_target, prop) => {
      if (prop === '$extends' || prop === '$transaction') {
        return () => fallbackClient;
      }
      if (prop === '$connect' || prop === '$disconnect') {
        return async () => {};
      }
      return noOp;
    },
  });

  return fallbackClient as unknown as PrismaClient;
}

const prismaClientSingleton = () => {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    return createFallbackClient();
  }
  
  try {
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({ adapter });
  } catch (err) {
    console.warn('[AI Studio] Failed to initialize PrismaNeon adapter:', err);
    try {
      return new PrismaClient();
    } catch {
      return createFallbackClient();
    }
  }
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env['NODE_ENV'] !== 'production') globalForPrisma.prisma = prisma;
