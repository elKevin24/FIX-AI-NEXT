import { PrismaClient, ServiceCategory } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script completo de seed para Service Templates
 * Crea 11 plantillas predefinidas + repuestos necesarios
 *
 * Categorías:
 * - MAINTENANCE: 3 templates
 * - REPAIR: 3 templates
 * - UPGRADE: 2 templates
 * - INSTALLATION: 2 templates
 * - DIAGNOSTIC: 1 template
 */

async function main() {
  try {
    console.log('🚀 Iniciando seed completo de Service Templates...\n');

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
    console.log('📦 Creando partes de inventario...\n');

    const partsData = [
      // Limpieza y mantenimiento
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
      {
        name: 'Limpiador de Contactos Electrónicos',
        sku: 'CLEANING-CONTACT-001',
        quantity: 25,
        cost: 12.00,
        price: 28.00,
        category: 'CLEANING',
        location: 'Estante A2',
        minStock: 5,
      },
      // Almacenamiento
      {
        name: 'SSD Kingston A400 240GB',
        sku: 'SSD-KING-240',
        quantity: 15,
        cost: 180.00,
        price: 280.00,
        category: 'STORAGE',
        location: 'Estante B1',
        minStock: 3,
      },
      {
        name: 'SSD Kingston A400 480GB',
        sku: 'SSD-KING-480',
        quantity: 10,
        cost: 280.00,
        price: 420.00,
        category: 'STORAGE',
        location: 'Estante B1',
        minStock: 2,
      },
      {
        name: 'Cable SATA III',
        sku: 'CABLE-SATA-001',
        quantity: 50,
        cost: 5.00,
        price: 15.00,
        category: 'CABLES',
        location: 'Estante B2',
        minStock: 10,
      },
      // Memoria RAM
      {
        name: 'RAM DDR4 8GB 2666MHz',
        sku: 'RAM-DDR4-8GB',
        quantity: 20,
        cost: 150.00,
        price: 250.00,
        category: 'MEMORY',
        location: 'Estante B3',
        minStock: 5,
      },
      {
        name: 'RAM DDR4 16GB 3200MHz',
        sku: 'RAM-DDR4-16GB',
        quantity: 10,
        cost: 280.00,
        price: 420.00,
        category: 'MEMORY',
        location: 'Estante B3',
        minStock: 3,
      },
      // Baterías genéricas
      {
        name: 'Batería Universal Laptop 6 Celdas',
        sku: 'BATTERY-UNI-6CELL',
        quantity: 8,
        cost: 180.00,
        price: 320.00,
        category: 'BATTERY',
        location: 'Estante C1',
        minStock: 2,
      },
      // Pantallas genéricas
      {
        name: 'Display LCD 15.6" HD',
        sku: 'DISPLAY-156-HD',
        quantity: 5,
        cost: 350.00,
        price: 550.00,
        category: 'DISPLAY',
        location: 'Estante C2',
        minStock: 2,
      },
      {
        name: 'Display LCD 14" HD',
        sku: 'DISPLAY-14-HD',
        quantity: 5,
        cost: 320.00,
        price: 500.00,
        category: 'DISPLAY',
        location: 'Estante C2',
        minStock: 2,
      },
    ];

    const parts: Record<string, typeof partsData[0] & { id: string }> = {};

    for (const partData of partsData) {
      const existingPart = await prisma.part.findFirst({
        where: {
          sku: partData.sku,
          tenantId: tenant.id,
        }
      });

      if (existingPart) {
        console.log(`  ↳ ${partData.name} (ya existe)`);
        parts[partData.sku] = { ...partData, id: existingPart.id };
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
        parts[partData.sku] = { ...partData, id: newPart.id };
      }
    }

    console.log(`\n✅ ${Object.keys(parts).length} partes procesadas\n`);

    // ========================================================================
    // PASO 2: Crear Templates
    // ========================================================================

    const templates = [
      // ==================== MAINTENANCE ====================
      {
        name: 'Mantenimiento Preventivo Básico',
        category: ServiceCategory.MAINTENANCE,
        defaultTitle: 'Mantenimiento preventivo básico',
        defaultDescription: `Servicio de mantenimiento preventivo básico que incluye:

✅ Limpieza física interna y externa
✅ Limpieza de ventiladores y disipadores
✅ Actualización de sistema operativo
✅ Actualización de drivers
✅ Escaneo de malware/antivirus
✅ Optimización de inicio
✅ Desfragmentación/Optimización de disco
✅ Verificación de temperaturas
✅ Backup de datos (opcional)

⏱️ Tiempo estimado: 90 minutos
📋 Garantía: 15 días`,
        defaultPriority: 'Low',
        estimatedDuration: 90,
        laborCost: 100.00,
        isActive: true,
        color: '#10B981',
        icon: '🔧',
        parts: [
          { sku: 'CLEANING-AIR-001', quantity: 1, required: true },
          { sku: 'CLEANING-ALCOHOL-001', quantity: 1, required: false },
          { sku: 'CLEANING-WIPES-001', quantity: 2, required: false },
        ]
      },
      {
        name: 'Mantenimiento Preventivo Premium',
        category: ServiceCategory.MAINTENANCE,
        defaultTitle: 'Mantenimiento premium completo',
        defaultDescription: `Servicio de mantenimiento premium que incluye todo del básico más:

✅ Todo lo del mantenimiento básico +
✅ Reemplazo de pasta térmica
✅ Limpieza profunda de teclado
✅ Calibración de batería
✅ Optimización de energía
✅ Instalación de actualizaciones críticas
✅ Pruebas de stress (CPU/GPU/RAM)
✅ Informe de diagnóstico completo

⏱️ Tiempo estimado: 2.5 horas
📋 Garantía: 30 días`,
        defaultPriority: 'Medium',
        estimatedDuration: 150,
        laborCost: 180.00,
        isActive: true,
        color: '#8B5CF6',
        icon: '⭐',
        parts: [
          { sku: 'THERMAL-PASTE-001', quantity: 1, required: true },
          { sku: 'CLEANING-AIR-001', quantity: 1, required: true },
          { sku: 'CLEANING-CONTACT-001', quantity: 1, required: true },
          { sku: 'CLEANING-ALCOHOL-001', quantity: 1, required: false },
          { sku: 'CLEANING-WIPES-001', quantity: 3, required: false },
        ]
      },
      {
        name: 'Limpieza Express',
        category: ServiceCategory.MAINTENANCE,
        defaultTitle: 'Limpieza rápida de equipo',
        defaultDescription: `Servicio de limpieza express:

✅ Limpieza externa del equipo
✅ Limpieza de pantalla
✅ Limpieza de teclado/mouse
✅ Limpieza básica de ventiladores
✅ Verificación rápida de funcionamiento

⏱️ Tiempo estimado: 30 minutos
📋 Ideal para: Mantenimiento básico rutinario`,
        defaultPriority: 'Low',
        estimatedDuration: 30,
        laborCost: 50.00,
        isActive: true,
        color: '#06B6D4',
        icon: '✨',
        parts: [
          { sku: 'CLEANING-ALCOHOL-001', quantity: 1, required: true },
          { sku: 'CLEANING-WIPES-001', quantity: 2, required: true },
        ]
      },

      // ==================== REPAIR ====================
      {
        name: 'Reemplazo de Pantalla',
        category: ServiceCategory.REPAIR,
        defaultTitle: 'Reemplazo de pantalla',
        defaultDescription: `⚠️ Problema: Pantalla rota/estrellada/sin imagen

Procedimiento:
✅ Diagnóstico de daño (táctil, LCD, digitalizador)
✅ Desarme cuidadoso del equipo
✅ Extracción de pantalla dañada
✅ Instalación de pantalla nueva
✅ Pruebas de táctil y visualización
✅ Calibración (si aplica)
✅ Ensamble final

⏱️ Tiempo estimado: 2 horas
📋 Garantía: 90 días en mano de obra
⚠️ Nota: El costo del display se cotiza según modelo`,
        defaultPriority: 'High',
        estimatedDuration: 120,
        laborCost: 150.00,
        isActive: true,
        color: '#EF4444',
        icon: '📱',
        parts: [
          // Display se agrega manualmente según modelo específico
        ]
      },
      {
        name: 'Reemplazo de Batería',
        category: ServiceCategory.REPAIR,
        defaultTitle: 'Reemplazo de batería',
        defaultDescription: `⚠️ Problema: Batería no carga/agotada/hinchada

Procedimiento:
✅ Diagnóstico de salud de batería
✅ Desarme seguro del equipo
✅ Desconexión de batería antigua
✅ Instalación de batería nueva
✅ Calibración de batería
✅ Pruebas de carga (30+ minutos)
✅ Verificación de autonomía

⏱️ Tiempo estimado: 1.5 horas
📋 Garantía: 6 meses en batería nueva
⚠️ Nota: El costo de la batería se cotiza según modelo`,
        defaultPriority: 'High',
        estimatedDuration: 90,
        laborCost: 100.00,
        isActive: true,
        color: '#F59E0B',
        icon: '🔋',
        parts: [
          // Batería se agrega manualmente según modelo específico
        ]
      },
      {
        name: 'Eliminación de Virus/Malware',
        category: ServiceCategory.REPAIR,
        defaultTitle: 'Eliminación de virus y malware',
        defaultDescription: `⚠️ Problema: Equipo lento, pop-ups, comportamiento extraño

Procedimiento:
✅ Arranque en modo seguro
✅ Escaneo completo con antivirus profesional
✅ Eliminación de malware detectado
✅ Limpieza de navegadores
✅ Eliminación de extensiones maliciosas
✅ Restauración de configuración de sistema
✅ Instalación de antivirus actualizado
✅ Educación al cliente (prevención)

⏱️ Tiempo estimado: 2 horas
📋 Garantía: 30 días
💡 Incluye: Licencia de antivirus básico`,
        defaultPriority: 'Medium',
        estimatedDuration: 120,
        laborCost: 120.00,
        isActive: true,
        color: '#DC2626',
        icon: '🦠',
        parts: []
      },

      // ==================== UPGRADE ====================
      {
        name: 'Upgrade a SSD',
        category: ServiceCategory.UPGRADE,
        defaultTitle: 'Instalación de disco SSD',
        defaultDescription: `🚀 Mejora: Reemplazo de HDD por SSD

Procedimiento:
✅ Backup completo de datos del cliente
✅ Desarme del equipo
✅ Instalación física del SSD
✅ Clonación del sistema operativo
✅ Verificación de arranque
✅ Optimización de SSD (TRIM, AHCI)
✅ Pruebas de velocidad
✅ Restauración de datos

⏱️ Tiempo estimado: 3 horas
📋 Garantía: 1 año en SSD nuevo
💡 Beneficio: Hasta 10x más velocidad de arranque`,
        defaultPriority: 'Medium',
        estimatedDuration: 180,
        laborCost: 150.00,
        isActive: true,
        color: '#10B981',
        icon: '💾',
        parts: [
          { sku: 'SSD-KING-240', quantity: 1, required: false },
          { sku: 'CABLE-SATA-001', quantity: 1, required: false },
        ]
      },
      {
        name: 'Upgrade de Memoria RAM',
        category: ServiceCategory.UPGRADE,
        defaultTitle: 'Expansión de memoria RAM',
        defaultDescription: `🚀 Mejora: Aumento de memoria RAM

Procedimiento:
✅ Verificación de compatibilidad (tipo, velocidad, slots)
✅ Desarme del equipo
✅ Instalación de módulos RAM
✅ Verificación en BIOS
✅ Pruebas de estabilidad (MemTest)
✅ Ensamble final
✅ Benchmarks de rendimiento

⏱️ Tiempo estimado: 45 minutos
📋 Garantía: 1 año en memoria nueva
💡 Beneficio: Mejor rendimiento multitarea`,
        defaultPriority: 'Low',
        estimatedDuration: 45,
        laborCost: 80.00,
        isActive: true,
        color: '#6366F1',
        icon: '🎯',
        parts: [
          { sku: 'RAM-DDR4-8GB', quantity: 1, required: false },
        ]
      },

      // ==================== INSTALLATION ====================
      {
        name: 'Instalación de Sistema Operativo',
        category: ServiceCategory.INSTALLATION,
        defaultTitle: 'Instalación de Windows/Linux',
        defaultDescription: `💿 Servicio: Instalación limpia de sistema operativo

Procedimiento:
✅ Backup de datos importantes (si aplica)
✅ Creación de medio de instalación
✅ Formateo e instalación del SO
✅ Instalación de drivers
✅ Actualización del sistema
✅ Instalación de software básico
✅ Configuración de usuario
✅ Restauración de datos (si aplica)

⏱️ Tiempo estimado: 2.5 horas
📋 Nota: Cliente debe proporcionar licencia del SO
💡 Incluye: Configuración básica de red y seguridad`,
        defaultPriority: 'Medium',
        estimatedDuration: 150,
        laborCost: 140.00,
        isActive: true,
        color: '#0EA5E9',
        icon: '💻',
        parts: []
      },
      {
        name: 'Instalación de Software Empresarial',
        category: ServiceCategory.INSTALLATION,
        defaultTitle: 'Instalación de Office y software',
        defaultDescription: `📦 Servicio: Instalación y configuración de software

Procedimiento:
✅ Verificación de requisitos del sistema
✅ Instalación de Microsoft Office / LibreOffice
✅ Activación de licencias
✅ Configuración de cuentas
✅ Sincronización de OneDrive/Cloud
✅ Instalación de plugins necesarios
✅ Tutorial básico al cliente

⏱️ Tiempo estimado: 1 hora
📋 Nota: Cliente debe proporcionar licencias
💡 Incluye: Configuración de correo y calendarios`,
        defaultPriority: 'Low',
        estimatedDuration: 60,
        laborCost: 80.00,
        isActive: true,
        color: '#14B8A6',
        icon: '📄',
        parts: []
      },

      // ==================== DIAGNOSTIC ====================
      {
        name: 'Diagnóstico Técnico Completo',
        category: ServiceCategory.DIAGNOSTIC,
        defaultTitle: 'Diagnóstico completo del equipo',
        defaultDescription: `🔍 Servicio: Evaluación técnica sin compromiso de reparación

Procedimiento:
✅ Entrevista con cliente (síntomas)
✅ Inspección visual (golpes, líquidos)
✅ Pruebas de arranque
✅ Diagnóstico de hardware (CPU, RAM, disco)
✅ Diagnóstico de software (SO, drivers)
✅ Medición de temperaturas
✅ Informe detallado escrito
✅ Presupuesto de reparación (si aplica)

⏱️ Tiempo estimado: 1 hora
📋 Incluye: Informe escrito detallado
⚠️ Nota: Cliente decide si autoriza reparación después`,
        defaultPriority: 'Medium',
        estimatedDuration: 60,
        laborCost: 100.00,
        isActive: true,
        color: '#64748B',
        icon: '🔬',
        parts: []
      },
    ];

    // ========================================================================
    // PASO 3: Crear templates en la base de datos
    // ========================================================================
    console.log('📋 Creando plantillas de servicio...\n');

    let createdCount = 0;
    let skippedCount = 0;

    for (const templateData of templates) {
      const { parts: templateParts, ...data } = templateData;

      // Verificar si ya existe
      const existingTemplate = await prisma.serviceTemplate.findFirst({
        where: {
          name: data.name,
          tenantId: tenant.id,
        }
      });

      if (existingTemplate) {
        console.log(`  ↳ ${data.icon} ${data.name} (ya existe)`);
        skippedCount++;
        continue;
      }

      // Crear template
      const template = await prisma.serviceTemplate.create({
        data: {
          ...data,
          tenantId: tenant.id,
          createdById: admin.id,
          updatedById: admin.id,
        }
      });

      console.log(`  ✓ ${data.icon} ${data.name}`);
      createdCount++;

      // Agregar partes default si existen
      if (templateParts && templateParts.length > 0) {
        for (const partRef of templateParts) {
          const part = parts[partRef.sku];
          if (part) {
            await prisma.templateDefaultPart.create({
              data: {
                templateId: template.id,
                partId: part.id,
                quantity: partRef.quantity,
                required: partRef.required,
              }
            });
            console.log(`      + ${part.name} (${partRef.required ? 'requerido' : 'sugerido'})`);
          }
        }
      }
    }

    // ========================================================================
    // RESUMEN
    // ========================================================================
    console.log('\n' + '='.repeat(65));
    console.log('✅ ¡SEED DE SERVICE TEMPLATES COMPLETADO!');
    console.log('='.repeat(65));

    console.log('\n📊 Resumen:');
    console.log(`  • ${Object.keys(parts).length} partes de inventario procesadas`);
    console.log(`  • ${createdCount} plantillas creadas`);
    console.log(`  • ${skippedCount} plantillas ya existían (omitidas)`);

    console.log('\n📋 Plantillas por categoría:');
    console.log('  MAINTENANCE (Mantenimiento):');
    console.log('    • 🔧 Mantenimiento Preventivo Básico - Q100');
    console.log('    • ⭐ Mantenimiento Preventivo Premium - Q180');
    console.log('    • ✨ Limpieza Express - Q50');
    console.log('  REPAIR (Reparaciones):');
    console.log('    • 📱 Reemplazo de Pantalla - Q150');
    console.log('    • 🔋 Reemplazo de Batería - Q100');
    console.log('    • 🦠 Eliminación de Virus/Malware - Q120');
    console.log('  UPGRADE (Mejoras):');
    console.log('    • 💾 Upgrade a SSD - Q150');
    console.log('    • 🎯 Upgrade de Memoria RAM - Q80');
    console.log('  INSTALLATION (Instalaciones):');
    console.log('    • 💻 Instalación de Sistema Operativo - Q140');
    console.log('    • 📄 Instalación de Software Empresarial - Q80');
    console.log('  DIAGNOSTIC (Diagnósticos):');
    console.log('    • 🔬 Diagnóstico Técnico Completo - Q100');

    console.log('\n🌐 Accede a la aplicación:');
    console.log('  • Ver plantillas:  http://localhost:3000/dashboard/settings/service-templates');
    console.log('  • Crear ticket:    http://localhost:3000/dashboard/tickets/create-with-template');

    console.log('\n💡 Tips:');
    console.log('  • Las partes REQUERIDAS consumirán stock automáticamente');
    console.log('  • Las partes SUGERIDAS se agregarán como notas internas');
    console.log('  • Los precios mostrados son de mano de obra (sin repuestos)');
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
