import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function createSuperAdmin() {
    console.log('🚀 Creando Super Admin (adminkev@example.com)...');

    // 1. Necesitamos un tenant para asociar al usuario (aunque sea Super Admin, necesita un tenantId por schema)
    // Buscamos el primero disponible o creamos uno por defecto
    let tenant = await prisma.tenant.findFirst({
        orderBy: { createdAt: 'asc' }
    });

    if (!tenant) {
        console.log('⚠️ No se encontró ningún tenant. Creando "Default Workshop"...');
        tenant = await prisma.tenant.create({
            data: {
                name: 'Default Workshop',
                slug: 'default',
            }
        });
    }

    console.log(`✅ Asociando a tenant: ${tenant.name}`);

    // 2. Hash de la contraseña
    const password = await bcryptjs.hash('password123', 12);

    // 3. Crear o actualizar usuario
    const admin = await prisma.user.upsert({
        where: { email: 'adminkev@example.com' },
        update: {
            role: 'ADMIN',
            password, // Actualizamos password para asegurar que sea el conocido
            name: 'Super Admin Kev',
            tenantId: tenant.id
        },
        create: {
            email: 'adminkev@example.com',
            name: 'Super Admin Kev',
            password,
            role: 'ADMIN',
            tenantId: tenant.id
        },
    });

    console.log('✅ Super Admin configurado exitosamente!');
    console.log('📧 Email: adminkev@example.com');
    console.log('🔑 Pass:  password123');
    console.log('🌍 Entorno: ' + (process.env.DATABASE_URL?.includes('neon') ? 'NEON (Cloud)' : 'LOCAL'));
}

createSuperAdmin()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error(e);
        prisma.$disconnect();
        process.exit(1);
    });
