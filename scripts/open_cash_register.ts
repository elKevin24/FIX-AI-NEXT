
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst();
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  if (!tenant || !user) {
    console.error('Tenant or Admin user not found');
    return;
  }

  const openRegister = await prisma.cashRegister.findFirst({
    where: { tenantId: tenant.id, isOpen: true }
  });

  if (openRegister) {
    console.log(`✅ Register "${openRegister.name}" is already open.`);
    return;
  }

  const newRegister = await prisma.cashRegister.create({
    data: {
      name: 'Caja Principal CLI',
      isOpen: true,
      openedAt: new Date(),
      openingBalance: 1000,
      expectedBalance: 1000,
      tenantId: tenant.id,
      openedById: user.id
    }
  });

  console.log(`🚀 Opened new register: ${newRegister.name}`);
}

main().finally(() => prisma.$disconnect());
