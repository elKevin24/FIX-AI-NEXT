import { prisma } from './src/lib/prisma';

async function main() {
    const users = await prisma.user.findMany({
        select: { email: true, role: true }
    });
    console.log("Users in DB:", users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
