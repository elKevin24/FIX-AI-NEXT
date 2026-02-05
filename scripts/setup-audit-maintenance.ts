import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Configurando mantenimiento de Auditoría...');
  
  const maintenanceFunction = `
    CREATE OR REPLACE FUNCTION purge_old_audit_data() RETURNS void AS $$
    BEGIN
      -- Borrar logs de auditoría de más de 365 días
      DELETE FROM "audit_logs" WHERE "createdAt" < NOW() - INTERVAL '365 days';
      
      -- Borrar logs de sesión de más de 90 días
      DELETE FROM "session_logs" WHERE "loginAt" < NOW() - INTERVAL '90 days';
      
      -- Borrar presencia inactiva de más de 24 horas (epímero)
      DELETE FROM "user_presence" WHERE "lastSeenAt" < NOW() - INTERVAL '24 hours';
      
      RAISE NOTICE 'Mantenimiento de auditoría completado.';
    END;
    $$ LANGUAGE plpgsql;
  `;

  try {
    await prisma.$executeRawUnsafe(maintenanceFunction);
    console.log('Función de mantenimiento creada exitosamente.');
    
    // Ejecución inicial
    await prisma.$executeRawUnsafe(`SELECT purge_old_audit_data();`);
    console.log('Limpieza inicial ejecutada.');
  } catch (e) {
    console.error('Error al configurar mantenimiento:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
