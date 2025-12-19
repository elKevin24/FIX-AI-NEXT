import { PrismaClient, ServiceCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🚀 Creando plantillas de mantenimiento...\n');

    // Obtener el tenant
    const tenant = await prisma.tenant.findFirst();

    if (!tenant) {
      console.error('❌ No se encontró ningún tenant');
      console.log('💡 Ejecuta: npm run db:seed');
      return;
    }

    // Obtener un usuario admin del tenant
    const admin = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        role: 'ADMIN'
      }
    });

    if (!admin) {
      console.error('❌ No se encontró un usuario admin');
      return;
    }

    console.log('✓ Tenant:', tenant.name);
    console.log('✓ Admin:', admin.email, '\n');

    // ========================================================================
    // PASO 1: Crear partes de inventario
    // ========================================================================
    console.log('📦 Creando partes de inventario...');

    const parts = [
      {
        name: 'Pasta Térmica Arctic MX-4',
        sku: 'THERMAL-PASTE-001',
        quantity: 50,
        cost: 15.00,
        price: 35.00,
        category: 'THERMAL',
        location: 'Estante A1',
        minStock: 5,
      },
      {
        name: 'Alcohol Isopropílico 99%',
        sku: 'CLEANING-ALCOHOL-001',
        quantity: 100,
        cost: 5.00,
        price: 12.00,
        category: 'CLEANING',
        location: 'Estante A2',
        minStock: 10,
      },
      {
        name: 'Toallas Antiestáticas Pack x10',
        sku: 'CLEANING-WIPES-001',
        quantity: 200,
        cost: 0.50,
        price: 2.00,
        category: 'CLEANING',
        location: 'Estante A2',
        minStock: 20,
      },
      {
        name: 'Aire Comprimido en Lata 400ml',
        sku: 'CLEANING-AIR-001',
        quantity: 30,
        cost: 8.00,
        price: 20.00,
        category: 'CLEANING',
        location: 'Estante A2',
        minStock: 5,
      },
    ];

    const createdParts = [];

    for (const partData of parts) {
      const existingPart = await prisma.part.findFirst({
        where: {
          sku: partData.sku,
          tenantId: tenant.id,
        }
      });

      if (existingPart) {
        console.log(`  ↳ ${partData.name} (ya existe)`);
        createdParts.push(existingPart);
      } else {
        const newPart = await prisma.part.create({
          data: {
            ...partData,
            tenantId: tenant.id,
            createdById: admin.id,
            updatedById: admin.id,
          }
        });
        console.log(`  ✓ ${partData.name}`);
        createdParts.push(newPart);
      }
    }

    // ========================================================================
    // PASO 2: Crear plantilla de Mantenimiento Preventivo
    // ========================================================================
    console.log('\n🧹 Creando plantilla: Mantenimiento Preventivo...');

    const maintenanceTemplate = await prisma.serviceTemplate.create({
      data: {
        name: 'Mantenimiento Preventivo de Laptop',
        category: ServiceCategory.MAINTENANCE,
        defaultTitle: 'Mantenimiento preventivo completo',
        defaultDescription: `Servicio de mantenimiento preventivo que incluye:
• Limpieza interna profunda del sistema
• Remoción de polvo de ventiladores y disipadores
• Reemplazo de pasta térmica en CPU y GPU
• Limpieza de contactos y conectores
• Optimización del sistema operativo
• Verificación de temperatura y rendimiento
• Respaldo de drivers actualizados

Tiempo estimado: 2 horas
Garantía: 30 días`,
        defaultPriority: 'Medium',
        estimatedDuration: 120, // 2 horas
        laborCost: 150.00,
        isActive: true,
        color: '#10B981', // Verde esmeralda
        icon: '🧹',
        tenantId: tenant.id,
        createdById: admin.id,
        updatedById: admin.id,
      }
    });

    console.log('  ✓ Plantilla creada con éxito');

    // Agregar partes REQUERIDAS (consumirán stock)
    await prisma.templateDefaultPart.create({
      data: {
        templateId: maintenanceTemplate.id,
        partId: createdParts[0].id, // Pasta térmica
        quantity: 1,
        required: true,
      }
    });
    console.log('  ✓ Parte requerida: Pasta Térmica (1x) - consumirá stock');

    await prisma.templateDefaultPart.create({
      data: {
        templateId: maintenanceTemplate.id,
        partId: createdParts[3].id, // Aire comprimido
        quantity: 1,
        required: true,
      }
    });
    console.log('  ✓ Parte requerida: Aire Comprimido (1x) - consumirá stock');

    // Agregar partes SUGERIDAS (no consumirán stock)
    await prisma.templateDefaultPart.create({
      data: {
        templateId: maintenanceTemplate.id,
        partId: createdParts[1].id, // Alcohol
        quantity: 1,
        required: false,
      }
    });
    console.log('  ✓ Parte sugerida: Alcohol Isopropílico (1x)');

    await prisma.templateDefaultPart.create({
      data: {
        templateId: maintenanceTemplate.id,
        partId: createdParts[2].id, // Toallas
        quantity: 3,
        required: false,
      }
    });
    console.log('  ✓ Parte sugerida: Toallas Antiestáticas (3x)');

    // ========================================================================
    // PASO 3: Crear plantilla de Limpieza Express
    // ========================================================================
    console.log('\n✨ Creando plantilla: Limpieza Express...');

    const expressTemplate = await prisma.serviceTemplate.create({
      data: {
        name: 'Limpieza Express',
        category: ServiceCategory.MAINTENANCE,
        defaultTitle: 'Limpieza rápida de equipo',
        defaultDescription: `Servicio de limpieza express:
• Limpieza externa del equipo
• Limpieza de teclado y pantalla
• Remoción de polvo superficial
• Revisión básica del sistema
• Optimización rápida

Tiempo estimado: 30 minutos
Ideal para: Mantenimiento básico rutinario`,
        defaultPriority: 'Low',
        estimatedDuration: 30,
        laborCost: 50.00,
        isActive: true,
        color: '#60A5FA', // Azul cielo
        icon: '✨',
        tenantId: tenant.id,
        createdById: admin.id,
        updatedById: admin.id,
      }
    });

    console.log('  ✓ Plantilla creada con éxito');

    await prisma.templateDefaultPart.create({
      data: {
        templateId: expressTemplate.id,
        partId: createdParts[1].id, // Alcohol
        quantity: 1,
        required: true,
      }
    });
    console.log('  ✓ Parte requerida: Alcohol Isopropílico (1x)');

    await prisma.templateDefaultPart.create({
      data: {
        templateId: expressTemplate.id,
        partId: createdParts[2].id, // Toallas
        quantity: 2,
        required: true,
      }
    });
    console.log('  ✓ Parte requerida: Toallas Antiestáticas (2x)');

    // ========================================================================
    // RESUMEN
    // ========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ ¡PLANTILLAS CREADAS EXITOSAMENTE!');
    console.log('='.repeat(60));
    console.log('\n📋 Resumen:');
    console.log('  • 4 partes de inventario agregadas');
    console.log('  • 2 plantillas de mantenimiento creadas');
    console.log('\n🎯 Plantillas disponibles:');
    console.log('  1. 🧹 Mantenimiento Preventivo de Laptop');
    console.log('     - Duración: 2 horas');
    console.log('     - Costo mano de obra: Q150.00');
    console.log('     - Partes requeridas: 2 (Pasta térmica + Aire comprimido)');
    console.log('     - Partes sugeridas: 2 (Alcohol + Toallas)');
    console.log('\n  2. ✨ Limpieza Express');
    console.log('     - Duración: 30 minutos');
    console.log('     - Costo mano de obra: Q50.00');
    console.log('     - Partes requeridas: 2 (Alcohol + Toallas)');
    console.log('\n🌐 Accede a la aplicación:');
    console.log('  • Ver plantillas: http://localhost:3000/dashboard/settings/service-templates');
    console.log('  • Crear ticket:   http://localhost:3000/dashboard/tickets/create-with-template');
    console.log('\n💡 Tip: Las partes REQUERIDAS consumirán stock automáticamente');
    console.log('    Las partes SUGERIDAS se agregarán como notas internas');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
