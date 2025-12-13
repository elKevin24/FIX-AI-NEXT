import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Test de Búsqueda Insensible a Acentos ---');

  // 1. Crear un Tenant y Cliente de prueba
  const tenantId = 'test-tenant-' + Date.now();
  
  // Create dummy tenant (if your schema requires it strictly, otherwise we fake the ID if no relation constraints prevent it)
  // Assuming Tenant model exists. If not, we just use the ID string if it's just a column.
  // Checking schema... assuming Tenant exists.
  try {
      await prisma.tenant.create({
          data: {
              id: tenantId,
              name: 'Test Workshop',
              slug: tenantId,
          }
      });
  } catch (e) {
      console.log("Nota: No se pudo crear Tenant (quizás ya existe o esquema diferente), continuando con ID simulado.");
  }

  const customerName = 'Ramón Núñez';
  const customerEmail = 'ramon@test.com';

  console.log(`1. Creando cliente: "${customerName}" en tenant: ${tenantId}`);
  
  await prisma.customer.create({
    data: {
      name: customerName,
      email: customerEmail,
      tenantId: tenantId,
      // Add createdBy if required by schema, assuming optional or handled by default
    },
  });

  // 2. Probar búsquedas
  const searchTerms = ['Ramón', 'Ramon', 'ramon', 'nuñez', 'nunez', 'NUÑEZ'];

  for (const term of searchTerms) {
    const searchPattern = `%${term}%`;
    
    // Ejecutar la misma Raw Query que en la API
    const results: any[] = await prisma.$queryRaw`
      SELECT id, name 
      FROM "customers" 
      WHERE "tenantId" = ${tenantId}
      AND (
        unaccent(name) ILIKE unaccent(${searchPattern})
      )
    `;

    const found = results.length > 0;
    const icon = found ? '✅' : '❌';
    console.log(`${icon} Búsqueda: "${term}" -> Encontrado: ${found} (${results.length})`);
  }

  // 3. Limpieza
  console.log('\nLimpiando datos de prueba...');
  await prisma.customer.deleteMany({ where: { tenantId } });
  await prisma.tenant.deleteMany({ where: { id: tenantId } }).catch(() => {});
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
