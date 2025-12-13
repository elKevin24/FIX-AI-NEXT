import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Diagnóstico de Cliente Sofía ---');

  // 1. Buscar clientes que se parezcan a Sofia (insensible a mayúsculas)
  const sofias = await prisma.customer.findMany({
    where: {
      name: { contains: 'Sof', mode: 'insensitive' }
    },
    include: {
      tenant: true
    }
  });

  console.log(`\nEncontrados ${sofias.length} clientes con 'Sof':`);
  sofias.forEach((c) => {
    console.log(`- ID: ${c.id}`);
    console.log(`  Nombre: ${c.name}`);
    console.log(`  Tenant ID: ${c.tenantId} (${c.tenant?.name})`);
  });

  // 2. Listar usuarios para ver sus Tenant IDs
  const users = await prisma.user.findMany({
    include: {
      tenant: true
    }
  });

  console.log(`\nUsuarios en el sistema:`);
  users.forEach((u) => {
    console.log(`- User: ${u.email} (${u.role})`);
    console.log(`  Tenant ID: ${u.tenantId} (${u.tenant?.name})`);
  });

  console.log('\n--- Análisis ---');
  if (sofias.length > 0 && users.length > 0) {
      const match = users.find((u) => u.tenantId === sofias[0].tenantId);
      if (match) {
          console.log(`El cliente '${sofias[0].name}' pertenece al mismo tenant que el usuario '${match.email}'. Debería ser visible.`);
      } else {
          console.log(`⚠️ ALERTA: El cliente '${sofias[0].name}' NO pertenece al tenant de ningún usuario listado arriba (o al menos no al tuyo si es diferente).`);
          console.log(`Tenant del cliente: ${sofias[0].tenantId}`);
          console.log(`Tenant de usuarios: ${users.map((u) => u.tenantId).join(', ')}`);
      }
  } else {
      console.log("No se encontraron clientes con 'Sof' o no hay usuarios.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
