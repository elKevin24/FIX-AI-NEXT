import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Starting Database Trigger Validation...');
  
  // Clean up test data if exists
  const testTenantId = 'test-trigger-tenant';
  // We might need a real user/tenant. Using a generated one or assume seed exists.
  // For safety, let's create a temporary test tenant structure if allowed, 
  // or use the first available one but create isolated data.
  // Let's rely on creating a dummy "part" in an existing tenant or creating a new tenant.
  // We'll try to find a system admin user to act as context.
  
  const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true, tenantId: true }
  });

  if (!adminUser) {
      console.error('❌ No admin user found to run tests. Please seed the database first.');
      process.exit(1);
  }

  const tenantId = adminUser.tenantId; // Use existing tenant
  const userId = adminUser.id;

  console.log(`ℹ️ Running tests in Tenant: ${tenantId}`);

  // ==========================================
  // 1. STOCK TRIGGER TEST
  // ==========================================
  console.log('\n📦 Testing Stock Triggers...');

  // Create a Part
  const initialQty = 100;
  const part = await prisma.part.create({
      data: {
          name: 'TEST-TRIGGER-PART',
          quantity: initialQty,
          cost: 10,
          price: 20,
          tenantId,
          createdById: userId,
          updatedById: userId
      }
  });
  console.log(`   ✅ Created Test Part (ID: ${part.id}) with Qty: ${initialQty}`);

  // Create a Ticket (needed for usage)
  const ticket = await prisma.ticket.create({
      data: {
          title: 'TEST-TRIGGER-TICKET',
          description: 'Testing Triggers',
          status: 'OPEN',
          priority: 'LOW',
          customerId: (await prisma.customer.findFirst({ where: { tenantId } }))?.id || '', // Need a customer
          tenantId,
          createdById: userId,
          updatedById: userId
      }
  });

  if (!ticket.customerId) {
       // If no customer, we can't create ticket easily due to constraints. 
       // Abort or create customer.
       console.log('   ⚠️ Skipping verification: No customer found.');
  } else {
      // 1.1 Insert Usage
      const usageQty = 5;
      const usage = await prisma.partUsage.create({
          data: {
              partId: part.id,
              ticketId: ticket.id,
              quantity: usageQty
          }
      });

      // Verify Stock Decrease
      const partAfterUsage = await prisma.part.findUnique({ where: { id: part.id } });
      if (partAfterUsage?.quantity === initialQty - usageQty) {
          console.log(`   ✅ [INSERT] Stock decreased correctly: ${initialQty} -> ${partAfterUsage.quantity}`);
      } else {
          console.error(`   ❌ [INSERT] Stock mismatch! Expected ${initialQty - usageQty}, got ${partAfterUsage?.quantity}`);
      }

      // 1.2 Update Usage
      const newUsageQty = 10; // (Difference +5)
      await prisma.partUsage.update({
          where: { id: usage.id },
          data: { quantity: newUsageQty }
      });

      // Verify Stock Adjustment
      const partAfterUpdate = await prisma.part.findUnique({ where: { id: part.id } });
      const expectedQtyAfterUpdate = initialQty - newUsageQty;
      if (partAfterUpdate?.quantity === expectedQtyAfterUpdate) {
          console.log(`   ✅ [UPDATE] Stock adjusted correctly: -> ${partAfterUpdate.quantity}`);
      } else {
          console.error(`   ❌ [UPDATE] Stock mismatch! Expected ${expectedQtyAfterUpdate}, got ${partAfterUpdate?.quantity}`);
      }

      // 1.3 Delete Usage
      await prisma.partUsage.delete({ where: { id: usage.id } });

      // Verify Stock Restoration
      const partAfterDelete = await prisma.part.findUnique({ where: { id: part.id } });
      if (partAfterDelete?.quantity === initialQty) {
          console.log(`   ✅ [DELETE] Stock restored correctly: -> ${partAfterDelete.quantity}`);
      } else {
          console.error(`   ❌ [DELETE] Stock mismatch! Expected ${initialQty}, got ${partAfterDelete?.quantity}`);
      }
  }

  // Cleanup Stock Test
  await prisma.part.delete({ where: { id: part.id } });
  if (ticket.customerId) await prisma.ticket.delete({ where: { id: ticket.id } });


  // ==========================================
  // 2. CASH REGISTER TRIGGER TEST (Simple Check)
  // ==========================================
  console.log('\n💰 Testing Cash Register Triggers...');
  
  // 2.1 Open Register
  const initialCash = 500;
  const register = await prisma.cashRegister.create({
      data: {
          isOpen: true,
          initialAmount: initialCash,
          currentAmount: initialCash, // Should be same initially
          tenantId,
          openedById: userId,
          openedAt: new Date()
      }
  });
  console.log(`   ✅ Opened Register (ID: ${register.id}) with Balance: ${initialCash}`);

  // 2.2 Add Income Transaction
  const incomeAmount = 100;
  const incomeTx = await prisma.transaction.create({
      data: {
          amount: incomeAmount,
          type: 'INCOME',
          description: 'Test Income',
          cashRegisterId: register.id,
          tenantId,
          createdById: userId
      }
  });

  // Verify Balance Increase
  const regAfterIncome = await prisma.cashRegister.findUnique({ where: { id: register.id } });
  const expectedregAfterIncome = initialCash + incomeAmount;
  
  if (Number(regAfterIncome?.currentAmount) === expectedregAfterIncome) {
      console.log(`   ✅ [INCOME] Balance increased correctly: ${initialCash} -> ${regAfterIncome?.currentAmount}`);
  } else {
      console.error(`   ❌ [INCOME] Balance mismatch! Expected ${expectedregAfterIncome}, got ${regAfterIncome?.currentAmount}. (Note: Triggers may not be active if this fails)`);
  }

  // 2.3 Add Expense Transaction
  const expenseAmount = 50;
  await prisma.transaction.create({
      data: {
          amount: expenseAmount,
          type: 'EXPENSE',
          description: 'Test Expense',
          cashRegisterId: register.id,
          tenantId,
          createdById: userId
      }
  });

  // Verify Balance Decrease
  const regAfterExpense = await prisma.cashRegister.findUnique({ where: { id: register.id } });
  const expectedRegAfterExpense = expectedregAfterIncome - expenseAmount;
  
  if (Number(regAfterExpense?.currentAmount) === expectedRegAfterExpense) {
      console.log(`   ✅ [EXPENSE] Balance decreased correctly: -> ${regAfterExpense?.currentAmount}`);
  } else {
      console.error(`   ❌ [EXPENSE] Balance mismatch! Expected ${expectedRegAfterExpense}, got ${regAfterExpense?.currentAmount}`);
  }

  // Cleanup Cash Test
  // Need to delete transactions first usually due to FK, but cascade might handle it or manual delete
  await prisma.transaction.deleteMany({ where: { cashRegisterId: register.id } });
  await prisma.cashRegister.delete({ where: { id: register.id } });

  console.log('\n✨ Validation Complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
