
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🛠️ Updating existing tickets with ticketNumber...');
  
  const tickets = await prisma.ticket.findMany({
    where: { ticketNumber: null }
  });

  console.log(`Found ${tickets.length} tickets to update.`);

  for (const ticket of tickets) {
    const number = ticket.id.slice(0, 8).toUpperCase();
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { ticketNumber: number }
    });
    console.log(`Updated Ticket ${ticket.id} -> #${number}`);
  }

  console.log('✅ Update complete.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
