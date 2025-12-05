import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Configurando usuario adminkev@example.com...');

    // Buscar el tenant existente
    const tenant = await prisma.tenant.findFirst({
        orderBy: { createdAt: 'asc' },
    });

    if (!tenant) {
        console.error('❌ No se encontró ningún tenant!');
        process.exit(1);
    }

    console.log(`✅ Tenant encontrado: ${tenant.name} (${tenant.id})`);

    // Hash de la contraseña
    const password = await bcryptjs.hash('password123', 12);
    console.log('✅ Password hash generado');

    // Eliminar usuario si existe
    await prisma.user.deleteMany({
        where: { email: 'adminkev@example.com' }
    });
    console.log('🗑️  Usuario anterior eliminado (si existía)');

    // Crear el usuario nuevo
    const admin = await prisma.user.create({
        data: {
            email: 'adminkev@example.com',
            name: 'Admin Kev',
            password,
            role: 'ADMIN',
            tenantId: tenant.id,
        },
    });

    console.log('✅ Usuario adminkev@example.com creado!');
    console.log({
        email: admin.email,
        name: admin.name,
        role: admin.role,
        tenantId: admin.tenantId,
        tenantName: tenant.name,
    });

    // Verificar tickets
    const ticketCount = await prisma.ticket.count({
        where: { tenantId: tenant.id },
    });

    console.log(`✅ Este tenant tiene ${ticketCount} tickets`);
    console.log('');
    console.log('🎉 Todo listo!');
    console.log('📧 Email: adminkev@example.com');
    console.log('🔑 Password: password123');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error('❌ Error:', e);
        await prisma.$disconnect();
        process.exit(1);
    });

