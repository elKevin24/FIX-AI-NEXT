
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFuzzy() {
  const tenantId = 'test-tenant-fuzzy';
  
  console.log('🧪 PROBANDO BÚSQUEDA DIFUSA (Fuzzy Search)');
  console.log('==========================================');

  // 1. Setup: Crear tenant y datos de prueba
  let tenant = await prisma.tenant.findUnique({ where: { slug: tenantId } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: 'Fuzzy Test Tenant', slug: tenantId }
    });
  }

  // Insertar un Repuesto y un Ticket con nombres correctos
  const part = await prisma.part.upsert({
    where: { unique_sku_per_tenant: { sku: 'SAM-S23', tenantId: tenant.id } },
    update: {},
    create: {
      name: 'Samsung Galaxy S23 Ultra Display',
      sku: 'SAM-S23',
      quantity: 5,
      cost: 150,
      price: 300,
      tenantId: tenant.id
    }
  });

  const customer = await prisma.customer.create({
    data: { name: 'Juan Perez', tenantId: tenant.id }
  });

  await prisma.ticket.create({
    data: {
      title: 'Mantenimiento Preventivo de Laptop',
      description: 'Limpieza y pasta térmica',
      tenantId: tenant.id,
      customerId: customer.id
    }
  });

  console.log('✅ Datos de prueba creados:');
  console.log('   - Repuesto: "Samsung Galaxy S23 Ultra Display"');
  console.log('   - Ticket:   "Mantenimiento Preventivo de Laptop"');

  // 2. Ejecutar búsquedas con errores
  const searchTerms = ['samsun', 'mantenimieto'];

  // Bajamos el umbral para ser más permisivos
  await prisma.$executeRaw`SET pg_trgm.similarity_threshold = 0.1;`;

  for (const term of searchTerms) {
    console.log(`
🔍 Buscando: "${term}"...`);
    
    // Consulta raw usando pg_trgm
    const results = await prisma.$queryRaw<any[]>`
      SELECT name as title, similarity(name, ${term}) as score, 'PART' as type
      FROM parts
      WHERE "tenantId" = ${tenant.id} AND name % ${term}
      UNION ALL
      SELECT title as title, similarity(title, ${term}) as score, 'TICKET' as type
      FROM tickets
      WHERE "tenantId" = ${tenant.id} AND title % ${term}
      ORDER BY score DESC;
    `;

    if (results.length > 0) {
      results.forEach(r => {
        console.log(`   ✨ Encontrado (${r.type}): "${r.title}"`);
        console.log(`      Score de similitud: ${(r.score * 100).toFixed(2)}%`);
      });
    } else {
      console.log('   ❌ No se encontraron resultados.');
    }
  }

  // Limpieza
  await prisma.ticket.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.part.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.customer.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.tenant.delete({ where: { id: tenant.id } });
}

testFuzzy()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
