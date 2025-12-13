import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = '6cb0ad1c-7d37-452d-9a6c-7dd32a148525'; // ID Real de ElectroFix
  const searchTerm = 'Sof';
  const searchPattern = `%${searchTerm}%`;

  console.log(`Probando Raw Query para tenant: ${tenantId}, término: '${searchTerm}'`);

  try {
    const customers = await prisma.$queryRaw`
      SELECT id, name, email, phone 
      FROM "customers"
      WHERE "tenantId" = ${tenantId}
      AND (
        unaccent(name) ILIKE unaccent(${searchPattern})
      )
    `;

    console.log('Resultados Raw Query:', customers);
  } catch (error) {
    console.error('Error en Raw Query:', error);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
