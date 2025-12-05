const { PrismaClient, UserRole } = require('@prisma/client');
const { hash } = require('bcryptjs');

console.log('🌱 [SEED] Initializing...');
const prisma = new PrismaClient();
console.log('🌱 [SEED] Prisma Client instantiated.');

async function main() {
    console.log('🌱 [SEED] main() started.');

    console.log('🌱 [SEED] Upserting tenant...');
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'default-workshop' },
        update: {},
        create: {
            name: 'Default Workshop',
            slug: 'default-workshop',
        },
    });
    console.log('🌱 [SEED] Tenant upserted successfully.');

    console.log('🌱 [SEED] Hashing password...');
    const password = await hash('password123', 12);
    console.log('🌱 [SEED] Password hashed successfully.');

    console.log('🌱 [SEED] Upserting admin user...');
    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            name: 'Admin User',
            password,
            role: UserRole.ADMIN,
            tenantId: tenant.id,
        },
    });
    console.log('🌱 [SEED] Admin user upserted successfully.');

    console.log('✅ [SEED] Success! Data seeded:');
    console.log({ tenant, admin });
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
