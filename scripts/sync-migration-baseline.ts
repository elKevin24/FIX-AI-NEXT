import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import 'dotenv/config';

/**
 * Script de utilidad para sincronizar y aplicar la migración baseline squasheada (`0_init`)
 * en bases de datos existentes que contengan el historial antiguo de 27 migraciones.
 *
 * Uso: npx tsx scripts/sync-migration-baseline.ts
 */
async function syncBaseline() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL no está definida en las variables de entorno.');
    process.exit(1);
  }

  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log('🚀 Iniciando sincronización de baseline de migraciones en PostgreSQL/Neon...');

  try {
    // 1. Respaldar historial previo en _prisma_migrations_archive si existe
    console.log('📦 1. Creando backup de auditoría en _prisma_migrations_archive...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations_archive" AS 
      SELECT * FROM "_prisma_migrations";
    `);

    // 2. Verificar si 0_init ya está registrado
    const existing = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, migration_name FROM "_prisma_migrations" WHERE migration_name = '0_init';
    `);

    if (existing.length > 0) {
      console.log('✅ La migración baseline "0_init" ya se encuentra registrada como aplicada.');
    } else {
      // Limpiar migraciones desfasadas y registrar 0_init
      console.log('🧹 2. Limpiando registros históricos desfasados de _prisma_migrations...');
      await prisma.$executeRawUnsafe(`DELETE FROM "_prisma_migrations";`);

      console.log('✨ 3. Registrando 0_init como migración baseline aplicada...');
      await prisma.$executeRawUnsafe(`
        INSERT INTO "_prisma_migrations" (
          id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
        ) VALUES (
          gen_random_uuid()::text,
          '',
          NOW(),
          '0_init',
          'Squashed baseline migration v2.0',
          NULL,
          NOW(),
          1
        );
      `);
      console.log('✅ Baseline 0_init registrado con éxito.');
    }

    console.log('🎉 Sincronización completada exitosamente.');
  } catch (error) {
    console.error('❌ Error durante la sincronización del baseline:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

syncBaseline();
