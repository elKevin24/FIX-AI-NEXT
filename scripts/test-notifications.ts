import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Probando Sistema de Notificaciones\n');
  console.log('=' .repeat(60));

  // Verificar configuración
  console.log('\n📋 VERIFICACIÓN DE CONFIGURACIÓN');
  console.log('=' .repeat(60));

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;

  console.log('✓ RESEND_API_KEY:', resendApiKey ? '✅ Configurada' : '❌ No configurada');
  console.log('✓ RESEND_FROM_EMAIL:', fromEmail || '⚠️  Usando default');
  console.log('✓ AUTH_URL:', authUrl || 'http://localhost:3000');

  if (!resendApiKey || resendApiKey.includes('REPLACE')) {
    console.log('\n⚠️  ADVERTENCIA: RESEND_API_KEY no está configurada correctamente');
    console.log('   Por favor, obtén tu API key de https://resend.com/api-keys');
    console.log('   y actualiza tu archivo .env.local');
    console.log('\n   Para pruebas sin email, las notificaciones in-app funcionarán normalmente.');
  }

  // Obtener datos de prueba
  console.log('\n📊 DATOS DE PRUEBA');
  console.log('=' .repeat(60));

  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error('❌ No se encontró ningún tenant. Ejecuta: npm run db:seed');
    return;
  }
  console.log('✓ Tenant:', tenant.name);

  const admin = await prisma.user.findFirst({
    where: {
      tenantId: tenant.id,
      role: 'ADMIN',
    },
  });
  if (!admin) {
    console.error('❌ No se encontró un usuario admin');
    return;
  }
  console.log('✓ Admin:', admin.email);

  const customers = await prisma.customer.findMany({
    where: {
      tenantId: tenant.id,
      email: { not: null },
    },
    take: 3,
  });

  console.log(`✓ Clientes con email: ${customers.length}`);
  customers.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.name} (${c.email})`);
  });

  if (customers.length === 0) {
    console.log('\n⚠️  No hay clientes con email configurado');
    console.log('   Crea un cliente con tu email personal para recibir notificaciones de prueba');
  }

  // Obtener tickets de ejemplo
  const tickets = await prisma.ticket.findMany({
    where: { tenantId: tenant.id },
    include: {
      customer: true,
      assignedTo: true,
    },
    take: 3,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n✓ Tickets recientes: ${tickets.length}`);
  tickets.forEach((t, i) => {
    console.log(`   ${i + 1}. #${t.ticketNumber} - ${t.customer.name} - ${t.status}`);
    if (t.customer.email) {
      console.log(`      Email: ${t.customer.email}`);
    }
  });

  // Resumen
  console.log('\n' + '=' .repeat(60));
  console.log('✅ VERIFICACIÓN COMPLETADA');
  console.log('=' .repeat(60));

  console.log('\n🚀 PRÓXIMOS PASOS PARA PROBAR:');
  console.log('   1. Asegúrate de tener RESEND_API_KEY configurada');
  console.log('   2. Crea un cliente con tu email personal');
  console.log('   3. Crea un ticket para ese cliente (wizard o manual)');
  console.log('   4. Cambia el estado del ticket');
  console.log('   5. Revisa:');
  console.log('      - Campana de notificaciones (in-app)');
  console.log('      - Tu bandeja de entrada (email)');
  console.log('      - Logs del servidor (consola)');
  console.log('      - Dashboard de Resend (https://resend.com/emails)');

  console.log('\n📚 DOCUMENTACIÓN:');
  console.log('   Ver: docs/NOTIFICATIONS.md');

  console.log('\n💡 TIPS:');
  console.log('   - Las notificaciones in-app funcionan SIN configurar Resend');
  console.log('   - Los errores de email NO bloquean las operaciones de ticket');
  console.log('   - Usa el dominio de prueba de Resend: onboarding@resend.dev');
  console.log('   - Para producción, verifica tu propio dominio');

  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
