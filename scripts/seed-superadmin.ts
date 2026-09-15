import { prisma } from '../src/lib/prisma';
import bcryptjs from 'bcryptjs';

async function createSuperAdmin() {
    console.log('🚀 Creando Super Admin (kevcordon5@gmail.com)...');

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

    // Limpiar usuario dummy anterior si existiera para mantener unicidad
    await prisma.user.deleteMany({
        where: { email: 'adminkev@example.com' }
    });

    // 2. Hash de la contraseña
    const password = await bcryptjs.hash('password123', 12);

    // 3. Crear o actualizar usuario Super Admin (Singleton)
    const existing = await prisma.user.findFirst({
        where: { email: 'kevcordon5@gmail.com' }
    });

    if (existing) {
        await prisma.user.update({
            where: { id: existing.id },
            data: {
                role: 'SUPER_ADMIN',
                password,
                name: 'Kevin Cordon',
                tenantId: tenant.id,
                isActive: true,
            },
        });
    } else {
        await prisma.user.create({
            data: {
                email: 'kevcordon5@gmail.com',
                name: 'Kevin Cordon',
                password,
                role: 'SUPER_ADMIN',
                tenantId: tenant.id,
                isActive: true,
            },
        });
    }

    console.log('✅ Super Admin configurado exitosamente!');
    console.log('📧 Email: kevcordon5@gmail.com');
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
