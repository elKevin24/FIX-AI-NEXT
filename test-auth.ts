import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { compare } from 'bcryptjs';

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! } as any);
  const prisma = new PrismaClient({ adapter });
  
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'admin@electrofix.com', isActive: true },
    });
    console.log('User found:', !!user);
    if (user) {
      console.log('DB hash:', user.password);
      const match = await compare('Admin@2024!', user.password);
      console.log('Password match (Admin@2024!):', match);
      
      const match2 = await compare('Password123!', user.password);
      console.log('Password match (Password123!):', match2);
    }
  } catch(e) {
    console.error(e);
  }
}
main();
