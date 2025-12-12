import { PrismaClient, UserRole, TicketStatus, ServiceCategory } from '@prisma/client';
import bcryptjs from 'bcryptjs';

console.log('🌱 [SEED] Initializing...');
const prisma = new PrismaClient();
console.log('🌱 [SEED] Prisma Client instantiated.');

async function main() {
    console.log('🌱 [SEED] main() started.');

    // Limpiar datos existentes (opcional, comentar si no quieres limpiar)
    console.log('🌱 [SEED] Cleaning existing data...');
    await prisma.partUsage.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.part.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
    console.log('🌱 [SEED] Data cleaned.');

    // Crear Tenant
    console.log('🌱 [SEED] Creating tenant...');
    const tenant = await prisma.tenant.create({
        data: {
            name: 'ElectroFix Workshop',
            slug: 'electrofix',
        },
    });
    console.log('🌱 [SEED] Tenant created successfully.');

    // Hash password para todos los usuarios
    console.log('🌱 [SEED] Hashing password...');
    const password = await bcryptjs.hash('password123', 12);
    console.log('🌱 [SEED] Password hashed successfully.');

    // Crear Usuarios
    console.log('🌱 [SEED] Creating users...');
    const admin = await prisma.user.create({
        data: {
            email: 'admin@electrofix.com',
            name: 'Carlos Rodriguez',
            password,
            role: UserRole.ADMIN,
            tenantId: tenant.id,
        },
    });

    const technician1 = await prisma.user.create({
        data: {
            email: 'tech1@electrofix.com',
            name: 'Miguel Torres',
            password,
            role: UserRole.TECHNICIAN,
            tenantId: tenant.id,
        },
    });

    const technician2 = await prisma.user.create({
        data: {
            email: 'tech2@electrofix.com',
            name: 'Ana Martinez',
            password,
            role: UserRole.TECHNICIAN,
            tenantId: tenant.id,
        },
    });

    const receptionist = await prisma.user.create({
        data: {
            email: 'recep@electrofix.com',
            name: 'Laura Gomez',
            password,
            role: UserRole.RECEPTIONIST,
            tenantId: tenant.id,
        },
    });
    console.log('🌱 [SEED] Users created successfully.');

    // Crear Clientes
    console.log('🌱 [SEED] Creating customers...');
    const customers = await Promise.all([
        prisma.customer.create({
            data: {
                name: 'Juan Pérez',
                email: 'juan.perez@email.com',
                phone: '+52 55 1234 5678',
                address: 'Av. Reforma 123, CDMX',
                tenantId: tenant.id,
                createdById: receptionist.id,
                updatedById: receptionist.id,
            },
        }),
        prisma.customer.create({
            data: {
                name: 'María García',
                email: 'maria.garcia@email.com',
                phone: '+52 55 2345 6789',
                address: 'Calle 5 de Mayo 456, Puebla',
                tenantId: tenant.id,
                createdById: receptionist.id,
                updatedById: receptionist.id,
            },
        }),
        prisma.customer.create({
            data: {
                name: 'Pedro Sánchez',
                email: 'pedro.sanchez@email.com',
                phone: '+52 55 3456 7890',
                address: 'Blvd. Juárez 789, Guadalajara',
                tenantId: tenant.id,
                createdById: receptionist.id,
                updatedById: receptionist.id,
            },
        }),
        prisma.customer.create({
            data: {
                name: 'Sofia López',
                email: 'sofia.lopez@email.com',
                phone: '+52 55 4567 8901',
                tenantId: tenant.id,
                createdById: receptionist.id,
                updatedById: receptionist.id,
            },
        }),
    ]);
    console.log('🌱 [SEED] Customers created successfully.');

    // Crear Partes/Repuestos
    console.log('🌱 [SEED] Creating parts...');
    const parts = await Promise.all([
        prisma.part.create({
            data: {
                name: 'Capacitor 1000µF 25V',
                sku: 'CAP-1000-25',
                quantity: 50,
                cost: 15.00,
                price: 35.00,
                tenantId: tenant.id,
            },
        }),
        prisma.part.create({
            data: {
                name: 'Resistencia 10kΩ',
                sku: 'RES-10K',
                quantity: 100,
                cost: 2.00,
                price: 5.00,
                tenantId: tenant.id,
            },
        }),
        prisma.part.create({
            data: {
                name: 'Transistor 2N2222',
                sku: 'TRS-2N2222',
                quantity: 30,
                cost: 8.00,
                price: 20.00,
                tenantId: tenant.id,
            },
        }),
        prisma.part.create({
            data: {
                name: 'LED Rojo 5mm',
                sku: 'LED-RED-5MM',
                quantity: 200,
                cost: 1.50,
                price: 4.00,
                tenantId: tenant.id,
            },
        }),
        prisma.part.create({
            data: {
                name: 'Pantalla LCD 16x2',
                sku: 'LCD-16X2',
                quantity: 10,
                cost: 120.00,
                price: 280.00,
                tenantId: tenant.id,
            },
        }),
    ]);
    console.log('🌱 [SEED] Parts created successfully.');

    // Crear Tickets
    console.log('🌱 [SEED] Creating tickets...');
    const ticket1 = await prisma.ticket.create({
        data: {
            id: '47d8cd53-0000-0000-0000-000000000000', // Fixed ID for Demo TV
            title: 'Reparación de TV Samsung 55"',
            description: 'TV no enciende, luz indicadora parpadea. Cliente reporta que dejó de funcionar después de un apagón.',
            status: TicketStatus.IN_PROGRESS,
            priority: 'High',
            tenantId: tenant.id,
            customerId: customers[0].id,
            assignedToId: technician1.id,
        },
    });

    const ticket2 = await prisma.ticket.create({
        data: {
            title: 'Microondas sin calentar',
            description: 'El microondas enciende y gira pero no calienta los alimentos.',
            status: TicketStatus.WAITING_FOR_PARTS,
            priority: 'Medium',
            tenantId: tenant.id,
            customerId: customers[1].id,
            assignedToId: technician2.id,
        },
    });

    const ticket3 = await prisma.ticket.create({
        data: {
            id: '5f8320f6-0000-0000-0000-000000000000', // Fixed ID for Demo Laptop
            title: 'Laptop HP - No carga batería',
            description: 'La laptop solo funciona conectada a la corriente, batería no carga.',
            status: TicketStatus.OPEN,
            priority: 'High',
            tenantId: tenant.id,
            customerId: customers[2].id,
        },
    });

    const ticket4 = await prisma.ticket.create({
        data: {
            title: 'Audio intermitente en parlantes',
            description: 'Los parlantes tienen audio que se corta intermitentemente.',
            status: TicketStatus.RESOLVED,
            priority: 'Low',
            tenantId: tenant.id,
            customerId: customers[3].id,
            assignedToId: technician1.id,
        },
    });

    const ticket5 = await prisma.ticket.create({
        data: {
            title: 'Consola PlayStation 4 - Error BLOD',
            description: 'Consola muestra luz azul de la muerte, no da video.',
            status: TicketStatus.IN_PROGRESS,
            priority: 'Medium',
            tenantId: tenant.id,
            customerId: customers[0].id,
            assignedToId: technician2.id,
        },
    });

    console.log('🌱 [SEED] Tickets created successfully.');

    // Crear Uso de Partes
    console.log('🌱 [SEED] Creating part usages...');
    await prisma.partUsage.create({
        data: {
            quantity: 2,
            ticketId: ticket1.id,
            partId: parts[0].id, // Capacitor
        },
    });

    await prisma.partUsage.create({
        data: {
            quantity: 5,
            ticketId: ticket1.id,
            partId: parts[1].id, // Resistencia
        },
    });

    await prisma.partUsage.create({
        data: {
            quantity: 3,
            ticketId: ticket4.id,
            partId: parts[1].id, // Resistencia
        },
    });

    await prisma.partUsage.create({
        data: {
            quantity: 1,
            ticketId: ticket5.id,
            partId: parts[0].id, // Capacitor
        },
    });

    console.log('🌱 [SEED] Part usages created successfully.');

    // Crear Audit Logs
    console.log('🌱 [SEED] Creating audit logs...');
    await prisma.auditLog.create({
        data: {
            action: 'TICKET_CREATED',
            details: JSON.stringify({ ticketId: ticket1.id, title: ticket1.title }),
            userId: receptionist.id,
            tenantId: tenant.id,
        },
    });

    await prisma.auditLog.create({
        data: {
            action: 'TICKET_ASSIGNED',
            details: JSON.stringify({ ticketId: ticket1.id, assignedTo: technician1.name }),
            userId: admin.id,
            tenantId: tenant.id,
        },
    });

    console.log('🌱 [SEED] Audit logs created successfully.');

    // Crear Service Templates
    console.log('🌱 [SEED] Creating service templates...');
    const templates = await Promise.all([
        // MAINTENANCE
        prisma.serviceTemplate.create({
            data: {
                name: 'Mantenimiento Básico PC',
                category: ServiceCategory.MAINTENANCE,
                defaultTitle: 'Mantenimiento preventivo de PC',
                defaultDescription: `Checklist de mantenimiento:
- Limpieza interna de polvo y suciedad
- Revisión de ventiladores y disipadores
- Aplicación de pasta térmica
- Limpieza de contactos de RAM
- Verificación de cables internos
- Actualización de drivers
- Escaneo antivirus completo
- Optimización del sistema`,
                defaultPriority: 'Low',
                estimatedDuration: 120, // 2 horas
                laborCost: 350.00,
                color: '#10B981', // green
                icon: '🧹',
                tenantId: tenant.id,
            },
        }),
        prisma.serviceTemplate.create({
            data: {
                name: 'Mantenimiento Laptop',
                category: ServiceCategory.MAINTENANCE,
                defaultTitle: 'Mantenimiento preventivo de Laptop',
                defaultDescription: `Checklist de mantenimiento:
- Limpieza de polvo con aire comprimido
- Revisión de bisagras y carcasa
- Limpieza de teclado
- Calibración de batería
- Verificación de estado de batería
- Limpieza de ventiladores
- Actualización de BIOS (si necesario)
- Optimización de energía`,
                defaultPriority: 'Low',
                estimatedDuration: 90,
                laborCost: 300.00,
                color: '#10B981',
                icon: '💻',
                tenantId: tenant.id,
            },
        }),

        // REPAIR
        prisma.serviceTemplate.create({
            data: {
                name: 'Reparación Fuente de Poder',
                category: ServiceCategory.REPAIR,
                defaultTitle: 'Reparación de fuente de alimentación',
                defaultDescription: `Proceso de reparación:
- Diagnóstico con multímetro
- Identificación de componentes dañados
- Reemplazo de capacitores inflados
- Prueba de voltajes (3.3V, 5V, 12V)
- Verificación de protecciones
- Prueba de carga durante 30 minutos
- Limpieza de circuitos`,
                defaultPriority: 'High',
                estimatedDuration: 180,
                laborCost: 450.00,
                color: '#EF4444', // red
                icon: '⚡',
                tenantId: tenant.id,
            },
        }),
        prisma.serviceTemplate.create({
            data: {
                name: 'Reparación de Pantalla Laptop',
                category: ServiceCategory.REPAIR,
                defaultTitle: 'Reemplazo de pantalla de laptop',
                defaultDescription: `Procedimiento:
- Identificar modelo exacto de pantalla
- Desmontar bisel y marco
- Desconectar cable LVDS/eDP
- Verificar compatibilidad de nueva pantalla
- Instalación de pantalla nueva
- Verificación de retroiluminación
- Prueba de resolución y colores
- Ensamblaje completo`,
                defaultPriority: 'High',
                estimatedDuration: 120,
                laborCost: 500.00,
                color: '#EF4444',
                icon: '🖥️',
                tenantId: tenant.id,
            },
        }),

        // UPGRADE
        prisma.serviceTemplate.create({
            data: {
                name: 'Upgrade RAM',
                category: ServiceCategory.UPGRADE,
                defaultTitle: 'Expansión de memoria RAM',
                defaultDescription: `Proceso de upgrade:
- Verificar tipo de RAM compatible (DDR3/DDR4/DDR5)
- Verificar slots disponibles
- Instalación de módulos nuevos
- Configuración en BIOS
- Verificación de reconocimiento
- Pruebas de estabilidad con MemTest86
- Benchmark de rendimiento`,
                defaultPriority: 'Medium',
                estimatedDuration: 45,
                laborCost: 150.00,
                color: '#3B82F6', // blue
                icon: '⬆️',
                tenantId: tenant.id,
            },
        }),
        prisma.serviceTemplate.create({
            data: {
                name: 'Upgrade SSD',
                category: ServiceCategory.UPGRADE,
                defaultTitle: 'Instalación de SSD y migración de datos',
                defaultDescription: `Checklist de upgrade:
- Verificar compatibilidad (SATA/NVMe)
- Clonación de disco con software especializado
- Instalación física del SSD
- Configuración de BIOS (modo AHCI)
- Verificación de booteo
- Optimización de SSD (TRIM)
- Benchmark de velocidad
- Eliminación segura de datos antiguos`,
                defaultPriority: 'Medium',
                estimatedDuration: 180,
                laborCost: 400.00,
                color: '#3B82F6',
                icon: '💾',
                tenantId: tenant.id,
            },
        }),

        // DIAGNOSTIC
        prisma.serviceTemplate.create({
            data: {
                name: 'Diagnóstico Completo PC',
                category: ServiceCategory.DIAGNOSTIC,
                defaultTitle: 'Diagnóstico exhaustivo de hardware y software',
                defaultDescription: `Pruebas a realizar:
- Verificación POST y BIOS
- Prueba de CPU con stress test
- Prueba de RAM con MemTest86
- Verificación de discos con CrystalDiskInfo
- Prueba de GPU con FurMark
- Verificación de temperaturas
- Análisis de logs de Windows
- Escaneo de malware
- Diagnóstico de red
- Reporte detallado de hallazgos`,
                defaultPriority: 'High',
                estimatedDuration: 240,
                laborCost: 600.00,
                color: '#F59E0B', // amber
                icon: '🔍',
                tenantId: tenant.id,
            },
        }),
        prisma.serviceTemplate.create({
            data: {
                name: 'Diagnóstico sin Video',
                category: ServiceCategory.DIAGNOSTIC,
                defaultTitle: 'Diagnóstico de problema de video',
                defaultDescription: `Proceso de diagnóstico:
- Verificar conexiones de monitor
- Probar con monitor externo
- Verificar cable de video interno (laptops)
- Prueba de GPU con otra PC
- Verificación de RAM (causa común)
- Prueba de salida HDMI/VGA
- Diagnóstico de tarjeta madre
- Revisión de chip de video integrado`,
                defaultPriority: 'High',
                estimatedDuration: 90,
                laborCost: 300.00,
                color: '#F59E0B',
                icon: '📺',
                tenantId: tenant.id,
            },
        }),

        // INSTALLATION
        prisma.serviceTemplate.create({
            data: {
                name: 'Instalación Windows',
                category: ServiceCategory.INSTALLATION,
                defaultTitle: 'Instalación de sistema operativo Windows',
                defaultDescription: `Proceso de instalación:
- Respaldo de datos importantes
- Creación de USB booteable
- Instalación limpia de Windows 10/11
- Instalación de drivers oficiales
- Activación de Windows
- Configuración de Windows Update
- Instalación de software básico (navegador, antivirus)
- Configuración de usuario
- Verificación de funcionamiento`,
                defaultPriority: 'Medium',
                estimatedDuration: 180,
                laborCost: 400.00,
                color: '#8B5CF6', // purple
                icon: '🪟',
                tenantId: tenant.id,
            },
        }),
        prisma.serviceTemplate.create({
            data: {
                name: 'Instalación Dual Boot',
                category: ServiceCategory.INSTALLATION,
                defaultTitle: 'Configuración de sistema dual boot',
                defaultDescription: `Instalación dual boot:
- Respaldo de datos críticos
- Particionado de disco
- Instalación de primer SO
- Instalación de segundo SO
- Configuración de bootloader (GRUB/Windows Boot Manager)
- Verificación de ambos sistemas
- Documentación de combinación de teclas
- Guía rápida para usuario`,
                defaultPriority: 'Medium',
                estimatedDuration: 240,
                laborCost: 550.00,
                color: '#8B5CF6',
                icon: '🔀',
                tenantId: tenant.id,
            },
        }),

        // CONSULTATION
        prisma.serviceTemplate.create({
            data: {
                name: 'Asesoría Técnica',
                category: ServiceCategory.CONSULTATION,
                defaultTitle: 'Consultoría y asesoría técnica',
                defaultDescription: `Servicio de asesoría:
- Análisis de necesidades del cliente
- Recomendaciones de hardware
- Presupuesto de equipo nuevo
- Asesoría de software especializado
- Capacitación básica de uso
- Recomendaciones de seguridad
- Plan de mantenimiento
- Dudas y preguntas generales`,
                defaultPriority: 'Low',
                estimatedDuration: 60,
                laborCost: 200.00,
                color: '#6366F1', // indigo
                icon: '💡',
                tenantId: tenant.id,
            },
        }),
    ]);

    console.log('🌱 [SEED] Service templates created successfully.');

    console.log('✅ [SEED] Success! Complete data seeded:');
    console.log({
        tenant,
        users: { admin, technician1, technician2, receptionist },
        customersCount: customers.length,
        partsCount: parts.length,
        ticketsCount: 5,
        templatesCount: templates.length,
    });
}

main()
    .then(async () => {
        console.log('🌱 [SEED] Disconnecting Prisma Client...');
        await prisma.$disconnect();
        console.log('🌱 [SEED] Prisma Client disconnected.');
    })
    .catch(async (e) => {
        console.error('❌ [SEED] Error seeding database:');
        console.error(e);
        console.log('🌱 [SEED] Disconnecting Prisma Client due to error...');
        await prisma.$disconnect();
        console.log('🌱 [SEED] Prisma Client disconnected.');
        process.exit(1);
    });
