import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

async function main() {
  try {
    console.log("Connecting...");
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
    const prisma = new PrismaClient({ adapter });
    const users = await prisma.user.findMany();
    console.log("Users:", users);
  } catch (e) {
    console.error("Error:", e);
  }
}
main();
