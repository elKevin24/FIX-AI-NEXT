import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  
  console.log('Tenants disponibles:');
  tenants.forEach(t => {
    console.log(`  - ${t.name} (slug: ${t.slug})`);
  });
  
  if (tenants.length === 0) {
    console.log('\n⚠️  No hay tenants en la base de datos');
    console.log('Ejecuta: npm run db:seed');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
