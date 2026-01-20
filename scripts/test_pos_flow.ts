
import { PrismaClient, PaymentMethod } from '@prisma/client';
// We won't import the server action directly due to next-auth dependency issues in CLI
// We will mimic the transaction logic to verify the DB flow is correct

const prisma = new PrismaClient();

async function testPOSFlow() {
  console.log('🧪 Testing POS Flow logic...');

  const tenant = await prisma.tenant.findFirst();
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const part = await prisma.part.findFirst({ where: { quantity: { gt: 5 } } });
  const register = await prisma.cashRegister.findFirst({ where: { isOpen: true } });

  if (!tenant || !user || !part || !register) {
    console.error('Missing data for test', { tenant:!!tenant, user:!!user, part:!!part, register:!!register });
    return;
  }

  const initialStock = part.quantity;
  const saleAmount = Number(part.price);

  console.log(`📦 Part: ${part.name} (Stock: ${initialStock}, Price: ${part.price})`);
  console.log(`💰 Register: ${register.name} (Balance: ${register.expectedBalance})`);

  // Mimic createPOSSale transaction
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Create Sale
      const sale = await tx.pOSSale.create({
        data: {
          saleNumber: 'TEST-POS-' + Date.now(),
          customerName: 'Test Customer',
          subtotal: part.price,
          total: part.price,
          amountPaid: part.price,
          tenantId: tenant.id,
          createdById: user.id,
          cashRegisterId: register.id,
          status: 'COMPLETED'
        }
      });

      // 2. Decrement Part
      await tx.part.update({
        where: { id: part.id },
        data: { quantity: { decrement: 1 } }
      });

      // 3. Create Transaction
      await tx.cashTransaction.create({
        data: {
          type: 'INCOME',
          amount: part.price,
          description: `Venta Test ${sale.saleNumber}`,
          cashRegisterId: register.id,
          tenantId: tenant.id,
          createdById: user.id,
          reference: sale.id
        }
      });
      
      // 4. Update Register Expected Balance
      await tx.cashRegister.update({
          where: { id: register.id },
          data: { expectedBalance: { increment: part.price } }
      });
    });

    console.log('✅ Transaction committed.');

    // Verification
    const updatedPart = await prisma.part.findUnique({ where: { id: part.id } });
    const updatedRegister = await prisma.cashRegister.findUnique({ where: { id: register.id } });

    console.log(`📊 Verification:`);
    console.log(`   Stock: ${initialStock} -> ${updatedPart?.quantity} (Diff: ${initialStock - (updatedPart?.quantity || 0)})`);
    console.log(`   Register Balance: ${register.expectedBalance} -> ${updatedRegister?.expectedBalance}`);

    if (updatedPart?.quantity === initialStock - 1) {
      console.log('✨ SUCCESS: Inventory correctly decremented.');
    } else {
      console.error('❌ FAILURE: Inventory mismatch.');
    }

  } catch (e) {
    console.error('❌ Transaction failed:', e);
  }
}

testPOSFlow().finally(() => prisma.$disconnect());
