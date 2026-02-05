import { PrismaClient, UserRole, TicketStatus, ServiceCategory } from '@prisma/client';
import bcryptjs from 'bcryptjs';

console.log('[SEED] Initializing...');
const prisma = new PrismaClient();
console.log('[SEED] Prisma Client instantiated.');

/**
 * Multi-tenant seed data
 * Creates 2 tenants with 5 users each (different roles)
 */
async function main() {
    console.log('[SEED] main() started.');

    // Limpiar datos existentes
    console.log('[SEED] Cleaning existing data...');
    await prisma.partUsage.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.part.deleteMany();
    await prisma.serviceTemplate.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
    console.log('[SEED] Data cleaned.');

    // Hash passwords
    console.log('[SEED] Hashing passwords...');
    const defaultPassword = await bcryptjs.hash('Password123!', 12);
    const adminPassword = await bcryptjs.hash('Admin@2024!', 12);
    console.log('[SEED] Passwords hashed successfully.');

    // ========================================
    // TENANT 1: ElectroFix Workshop
    // ========================================
    console.log('[SEED] Creating Tenant 1: ElectroFix Workshop...');
    const tenant1 = await prisma.tenant.create({
        data: {
            name: 'ElectroFix Workshop',
            slug: 'electrofix',
        },
    });

    // Create users for Tenant 1
    const t1Admin = await prisma.user.create({
        data: {
            email: 'admin@electrofix.com',
            password: adminPassword,
            firstName: 'Carlos',
            lastName: 'Rodriguez',
            name: 'Carlos Rodriguez',
            role: UserRole.ADMIN,
            tenantId: tenant1.id,
            isActive: true,
            passwordMustChange: false,
        },
    });

    // Update tenant with adminUserId
    await prisma.tenant.update({
        where: { id: tenant1.id },
        data: { adminUserId: t1Admin.id },
    });

    const t1Manager = await prisma.user.create({
        data: {
            email: 'manager@electrofix.com',
            password: defaultPassword,
            firstName: 'Ana',
            lastName: 'Martinez',
            name: 'Ana Martinez',
            role: UserRole.MANAGER,
            tenantId: tenant1.id,
            isActive: true,
            passwordMustChange: false,
            createdById: t1Admin.id,
        },
    });

    const t1Agent1 = await prisma.user.create({
        data: {
            email: 'miguel@electrofix.com',
            password: defaultPassword,
            firstName: 'Miguel',
            lastName: 'Torres',
            name: 'Miguel Torres',
            role: UserRole.TECHNICIAN,
            tenantId: tenant1.id,
            isActive: true,
            passwordMustChange: false,
            createdById: t1Admin.id,
        },
    });

    const t1Agent2 = await prisma.user.create({
        data: {
            email: 'lucia@electrofix.com',
            password: defaultPassword,
            firstName: 'Lucia',
            lastName: 'Fernandez',
            name: 'Lucia Fernandez',
            role: UserRole.TECHNICIAN,
            tenantId: tenant1.id,
            isActive: true,
            passwordMustChange: false,
            createdById: t1Manager.id,
        },
    });

    const t1Viewer = await prisma.user.create({
        data: {
            email: 'recepcion@electrofix.com',
            password: defaultPassword,
            firstName: 'Laura',
            lastName: 'Gomez',
            name: 'Laura Gomez',
            role: UserRole.VIEWER,
            tenantId: tenant1.id,
            isActive: true,
            passwordMustChange: false,
            createdById: t1Admin.id,
        },
    });

    console.log('[SEED] Tenant 1 users created.');

    // Customers for Tenant 1
    console.log('[SEED] Creating customers for Tenant 1...');
    const t1Customers = await Promise.all([
        prisma.customer.create({
            data: {
                name: 'Juan Pérez',
                email: 'juan.perez@email.com',
                phone: '+52 55 1234 5678',
                address: 'Av. Reforma 123, CDMX',
                tenantId: tenant1.id,
                createdById: t1Viewer.id,
                updatedById: t1Viewer.id,
            },
        }),
        prisma.customer.create({
            data: {
                name: 'María García',
                email: 'maria.garcia@email.com',
                phone: '+52 55 2345 6789',
                address: 'Calle 5 de Mayo 456, Puebla',
                tenantId: tenant1.id,
                createdById: t1Viewer.id,
                updatedById: t1Viewer.id,
            },
        }),
        prisma.customer.create({
            data: {
                name: 'Pedro Sánchez',
                email: 'pedro.sanchez@email.com',
                phone: '+52 55 3456 7890',
                address: 'Blvd. Juárez 789, Guadalajara',
                tenantId: tenant1.id,
                createdById: t1Viewer.id,
                updatedById: t1Viewer.id,
            },
        }),
    ]);

    // Parts for Tenant 1
    console.log('[SEED] Creating parts for Tenant 1...');
    await Promise.all([
        prisma.part.create({
            data: {
                name: 'Capacitor 1000µF 25V',
                sku: 'CAP-1000-25',
                quantity: 50,
                cost: 15.00,
                price: 35.00,
                tenantId: tenant1.id,
            },
        }),
        prisma.part.create({
            data: {
                name: 'Resistencia 10kΩ',
                sku: 'RES-10K',
                quantity: 100,
                cost: 2.00,
                price: 5.00,
                tenantId: tenant1.id,
            },
        }),
        prisma.part.create({
            data: {
                name: 'Transistor 2N2222',
                sku: 'TRS-2N2222',
                quantity: 30,
                cost: 8.00,
                price: 20.00,
                tenantId: tenant1.id,
            },
        }),
    ]);

    // Tickets for Tenant 1
    console.log('[SEED] Creating tickets for Tenant 1...');
    await Promise.all([
        prisma.ticket.create({
            data: {
                title: 'Reparación de TV Samsung 55"',
                description: 'TV no enciende, luz indicadora parpadea.',
                status: TicketStatus.IN_PROGRESS,
                priority: 'High',
                tenantId: tenant1.id,
                customerId: t1Customers[0].id,
                assignedToId: t1Agent1.id,
            },
        }),
        prisma.ticket.create({
            data: {
                title: 'Microondas sin calentar',
                description: 'El microondas enciende y gira pero no calienta.',
                status: TicketStatus.WAITING_FOR_PARTS,
                priority: 'Medium',
                tenantId: tenant1.id,
                customerId: t1Customers[1].id,
                assignedToId: t1Agent2.id,
            },
        }),
        prisma.ticket.create({
            data: {
                title: 'Laptop HP - No carga batería',
                description: 'La laptop solo funciona conectada a la corriente.',
                status: TicketStatus.OPEN,
                priority: 'High',
                tenantId: tenant1.id,
                customerId: t1Customers[2].id,
            },
        }),
    ]);

    // ========================================
    // TENANT 2: TechRepair Pro
    // ========================================
    console.log('[SEED] Creating Tenant 2: TechRepair Pro...');
    const tenant2 = await prisma.tenant.create({
        data: {
            name: 'TechRepair Pro',
            slug: 'techrepair',
        },
    });

    // Create users for Tenant 2
    const t2Admin = await prisma.user.create({
        data: {
            email: 'admin@techrepair.com',
            password: adminPassword,
            firstName: 'Roberto',
            lastName: 'Diaz',
            name: 'Roberto Diaz',
            role: UserRole.ADMIN,
            tenantId: tenant2.id,
            isActive: true,
            passwordMustChange: false,
        },
    });

    // Update tenant with adminUserId
    await prisma.tenant.update({
        where: { id: tenant2.id },
        data: { adminUserId: t2Admin.id },
    });

    const t2Manager = await prisma.user.create({
        data: {
            email: 'sandra@techrepair.com',
            password: defaultPassword,
            firstName: 'Sandra',
            lastName: 'Lopez',
            name: 'Sandra Lopez',
            role: UserRole.MANAGER,
            tenantId: tenant2.id,
            isActive: true,
            passwordMustChange: false,
            createdById: t2Admin.id,
        },
    });

    const t2Agent1 = await prisma.user.create({
        data: {
            email: 'pedro@techrepair.com',
            password: defaultPassword,
            firstName: 'Pedro',
            lastName: 'Morales',
            name: 'Pedro Morales',
            role: UserRole.TECHNICIAN,
            tenantId: tenant2.id,
            isActive: true,
            passwordMustChange: false,
            createdById: t2Admin.id,
        },
    });

    await prisma.user.create({
        data: {
            email: 'carmen@techrepair.com',
            password: defaultPassword,
            firstName: 'Carmen',
            lastName: 'Ruiz',
            name: 'Carmen Ruiz',
            role: UserRole.TECHNICIAN,
            tenantId: tenant2.id,
            isActive: true,
            passwordMustChange: false,
            createdById: t2Manager.id,
        },
    });

    // Inactive user example
    await prisma.user.create({
        data: {
            email: 'exemployee@techrepair.com',
            password: defaultPassword,
            firstName: 'Juan',
            lastName: 'Anterior',
            name: 'Juan Anterior',
            role: UserRole.TECHNICIAN,
            tenantId: tenant2.id,
            isActive: false,
            passwordMustChange: false,
            createdById: t2Admin.id,
        },
    });

    console.log('[SEED] Tenant 2 users created.');

    // Customers for Tenant 2
    console.log('[SEED] Creating customers for Tenant 2...');
    const t2Customers = await Promise.all([
        prisma.customer.create({
            data: {
                name: 'Empresa ABC S.A.',
                email: 'contacto@empresaabc.com',
                phone: '+52 33 1111 2222',
                address: 'Zona Industrial 100, Monterrey',
                tenantId: tenant2.id,
                createdById: t2Manager.id,
                updatedById: t2Manager.id,
            },
        }),
        prisma.customer.create({
            data: {
                name: 'Hotel Gran Plaza',
                email: 'mantenimiento@granplaza.com',
                phone: '+52 33 3333 4444',
                address: 'Av. Principal 500, Monterrey',
                tenantId: tenant2.id,
                createdById: t2Agent1.id,
                updatedById: t2Agent1.id,
            },
        }),
    ]);

    // Parts for Tenant 2
    console.log('[SEED] Creating parts for Tenant 2...');
    await Promise.all([
        prisma.part.create({
            data: {
                name: 'SSD 500GB NVMe',
                sku: 'SSD-500-NVME',
                quantity: 20,
                cost: 800.00,
                price: 1200.00,
                tenantId: tenant2.id,
            },
        }),
        prisma.part.create({
            data: {
                name: 'Memoria RAM 8GB DDR4',
                sku: 'RAM-8GB-DDR4',
                quantity: 15,
                cost: 400.00,
                price: 650.00,
                tenantId: tenant2.id,
            },
        }),
    ]);

    // Tickets for Tenant 2
    console.log('[SEED] Creating tickets for Tenant 2...');
    await Promise.all([
        prisma.ticket.create({
            data: {
                title: 'Servidor no responde',
                description: 'Servidor principal de la empresa no arranca.',
                status: TicketStatus.IN_PROGRESS,
                priority: 'Critical',
                tenantId: tenant2.id,
                customerId: t2Customers[0].id,
                assignedToId: t2Agent1.id,
            },
        }),
        prisma.ticket.create({
            data: {
                title: 'Actualización sistema punto de venta',
                description: 'Requiere actualización del software POS.',
                status: TicketStatus.OPEN,
                priority: 'Medium',
                tenantId: tenant2.id,
                customerId: t2Customers[1].id,
            },
        }),
    ]);

    // ========================================
    // SERVICE TEMPLATES (Shared structure)
    // ========================================
    console.log('[SEED] Creating service templates...');
    // Templates for Tenant 1
    await Promise.all([
        prisma.serviceTemplate.create({
            data: {
                name: 'Mantenimiento Básico PC',
                category: ServiceCategory.MAINTENANCE,
                defaultTitle: 'Mantenimiento preventivo de PC',
                defaultDescription: 'Limpieza interna, revisión de ventiladores, actualización de drivers.',
                defaultPriority: 'Low',
                estimatedDuration: 120,
                laborCost: 350.00,
                color: '#10B981',
                tenantId: tenant1.id,
            },
        }),
        prisma.serviceTemplate.create({
            data: {
                name: 'Reparación Fuente de Poder',
                category: ServiceCategory.REPAIR,
                defaultTitle: 'Reparación de fuente de alimentación',
                defaultDescription: 'Diagnóstico con multímetro, reemplazo de componentes.',
                defaultPriority: 'High',
                estimatedDuration: 180,
                laborCost: 450.00,
                color: '#EF4444',
                tenantId: tenant1.id,
            },
        }),
    ]);

    // Templates for Tenant 2
    await Promise.all([
        prisma.serviceTemplate.create({
            data: {
                name: 'Diagnóstico Servidor',
                category: ServiceCategory.DIAGNOSTIC,
                defaultTitle: 'Diagnóstico completo de servidor',
                defaultDescription: 'Verificación de hardware, logs, rendimiento.',
                defaultPriority: 'High',
                estimatedDuration: 240,
                laborCost: 800.00,
                color: '#F59E0B',
                tenantId: tenant2.id,
            },
        }),
        prisma.serviceTemplate.create({
            data: {
                name: 'Upgrade de Hardware',
                category: ServiceCategory.UPGRADE,
                defaultTitle: 'Actualización de componentes',
                defaultDescription: 'Instalación de nuevos componentes, migración de datos.',
                defaultPriority: 'Medium',
                estimatedDuration: 180,
                laborCost: 500.00,
                color: '#3B82F6',
                tenantId: tenant2.id,
            },
        }),
    ]);

    // ========================================
    // AUDIT LOGS
    // ========================================
    console.log('[SEED] Creating audit logs...');
    await Promise.all([
        prisma.auditLog.create({
            data: {
                action: 'TENANT_SEEDED',
                details: JSON.stringify({ tenantName: 'ElectroFix Workshop' }),
                userId: t1Admin.id,
                tenantId: tenant1.id,
            },
        }),
        prisma.auditLog.create({
            data: {
                action: 'TENANT_SEEDED',
                details: JSON.stringify({ tenantName: 'TechRepair Pro' }),
                userId: t2Admin.id,
                tenantId: tenant2.id,
            },
        }),
    ]);

    console.log('[SEED] Seed completed successfully!');
    console.log('');
    console.log('='.repeat(60));
    console.log('TEST CREDENTIALS');
    console.log('='.repeat(60));
    console.log('');
    console.log('TENANT 1: ElectroFix Workshop');
    console.log('  Admin:   admin@electrofix.com / Admin@2024!');
    console.log('  Manager: manager@electrofix.com / Password123!');
    console.log('  Agent:   miguel@electrofix.com / Password123!');
    console.log('  Agent:   lucia@electrofix.com / Password123!');
    console.log('  Viewer:  recepcion@electrofix.com / Password123!');
    console.log('');
    console.log('TENANT 2: TechRepair Pro');
    console.log('  Admin:   admin@techrepair.com / Admin@2024!');
    console.log('  Manager: sandra@techrepair.com / Password123!');
    console.log('  Agent:   pedro@techrepair.com / Password123!');
    console.log('  Agent:   carmen@techrepair.com / Password123!');
    console.log('  (Inactive) exemployee@techrepair.com');
    console.log('');
    console.log('='.repeat(60));
}

main()
    .then(async () => {
        console.log('[SEED] Disconnecting Prisma Client...');
        await prisma.$disconnect();
        console.log('[SEED] Prisma Client disconnected.');
    })
    .catch(async (e) => {
        console.error('[SEED] Error seeding database:');
        console.error(e);
        console.log('[SEED] Disconnecting Prisma Client due to error...');
        await prisma.$disconnect();
        console.log('[SEED] Prisma Client disconnected.');
        process.exit(1);
    });
