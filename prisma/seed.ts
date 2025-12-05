import { PrismaClient, UserRole, TicketStatus } from '@prisma/client';
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
            },
        }),
        prisma.customer.create({
            data: {
                name: 'María García',
                email: 'maria.garcia@email.com',
                phone: '+52 55 2345 6789',
                address: 'Calle 5 de Mayo 456, Puebla',
                tenantId: tenant.id,
            },
        }),
        prisma.customer.create({
            data: {
                name: 'Pedro Sánchez',
                email: 'pedro.sanchez@email.com',
                phone: '+52 55 3456 7890',
                address: 'Blvd. Juárez 789, Guadalajara',
                tenantId: tenant.id,
            },
        }),
        prisma.customer.create({
            data: {
                name: 'Sofia López',
                email: 'sofia.lopez@email.com',
                phone: '+52 55 4567 8901',
                tenantId: tenant.id,
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

    console.log('✅ [SEED] Success! Complete data seeded:');
    console.log({
        tenant,
        users: { admin, technician1, technician2, receptionist },
        customersCount: customers.length,
        partsCount: parts.length,
        ticketsCount: 5,
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
