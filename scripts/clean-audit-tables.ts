import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Dropping audit_logs, session_logs, and user_presence tables...');
  try {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "audit_logs" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "session_logs" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "user_presence" CASCADE;`);
    console.log('Tables dropped successfully.');
  } catch (e) {
    console.error('Error dropping tables:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
