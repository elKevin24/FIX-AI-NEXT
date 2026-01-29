import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 VERIFICATION: Inventory Triggers & Logic');
  console.log('===========================================');

  const tenantId = 'test-tenant-verification';
  
  // 0. Cleanup from previous runs
  const existingTenant = await prisma.tenant.findUnique({ where: { slug: tenantId } });
  if (existingTenant) {
      console.log('🧹 Cleaning up previous run...');
      // Manually delete related records to avoid FK errors
      await prisma.pOSSaleItem.deleteMany({ where: { sale: { tenantId: existingTenant.id } } });
      await prisma.pOSSale.deleteMany({ where: { tenantId: existingTenant.id } });
      await prisma.partUsage.deleteMany({ where: { ticket: { tenantId: existingTenant.id } } });
      await prisma.ticket.deleteMany({ where: { tenantId: existingTenant.id } });
      await prisma.part.deleteMany({ where: { tenantId: existingTenant.id } });
      await prisma.customer.deleteMany({ where: { tenantId: existingTenant.id } });
      await prisma.user.deleteMany({ where: { tenantId: existingTenant.id } });
      
      await prisma.tenant.delete({ where: { id: existingTenant.id } });
  }

  // 1. Setup Test Data
  console.log('1️⃣  Setting up test environment...');
  
  // Create/Get Tenant
  let tenant = await prisma.tenant.findUnique({ where: { slug: tenantId } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: 'Verification Tenant', slug: tenantId }
    });
  }

  // Create User
  let user = await prisma.user.findFirst({ where: { email: 'verify@test.com' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'verify@test.com',
        password: 'hash',
        name: 'Tester',
        role: 'ADMIN',
        tenantId: tenant.id
      }
    });
  }

  // Create Customer
  const customer = await prisma.customer.create({
    data: { name: 'Test Customer', tenantId: tenant.id }
  });

  // Create Part (Initial Stock: 10)
  const part = await prisma.part.create({
    data: {
      name: 'Test Part',
      quantity: 10,
      cost: 100,
      price: 200,
      tenantId: tenant.id,
      createdById: user.id
    }
  });

  console.log(`   ✅ Part created: ${part.name} (Stock: ${part.quantity})`);

  // 2. Verify Ticket Creation (Should use trigger)
  console.log('\n2️⃣  Verifying Ticket Creation (Trigger Test)...');
  
  // Create Ticket with Usage (Code simulates what actions.ts does now: just create usage)
  const ticket = await prisma.ticket.create({
    data: {
      title: 'Test Ticket',
      description: 'Test',
      status: 'OPEN',
      priority: 'MEDIUM',
      tenantId: tenant.id,
      customerId: customer.id,
      createdById: user.id,
      updatedById: user.id
    }
  });

  // Create Usage (Logic from actions.ts cleaned up)
  // We expect trigger 'trg_update_stock_on_usage' to fire
  await prisma.partUsage.create({
    data: {
      ticketId: ticket.id,
      partId: part.id,
      quantity: 2
    }
  });

  // Check Stock
  const partAfterTicket = await prisma.part.findUnique({ where: { id: part.id } });
  const expectedTicketStock = 10 - 2;
  
  console.log(`   Expected Stock: ${expectedTicketStock}`);
  console.log(`   Actual Stock:   ${partAfterTicket?.quantity}`);

  if (partAfterTicket?.quantity === expectedTicketStock) {
    console.log('   ✅ PASS: Ticket creation correctly discounted stock exactly once.');
  } else {
    console.log('   ❌ FAIL: Stock mismatch. Possible double counting or no trigger.');
  }

  // 3. Verify POS Sale (Should use trigger)
  console.log('\n3️⃣  Verifying POS Sale (Trigger Test)...');

  const sale = await prisma.pOSSale.create({
    data: {
      saleNumber: 'TEST-POS-001',
      subtotal: 200,
      taxRate: 12,
      taxAmount: 24,
      total: 224,
      amountPaid: 224,
      changeGiven: 0,
      status: 'COMPLETED',
      tenantId: tenant.id,
      createdById: user.id
    }
  });

  // Create Sale Item (Logic from pos-actions.ts)
  // We expect trigger 'trg_update_stock_on_pos_item' to fire
  await prisma.pOSSaleItem.create({
    data: {
      saleId: sale.id,
      partId: part.id,
                quantity: 3,
                unitPrice: 200
              }
            });
  // Check Stock
  const partAfterPOS = await prisma.part.findUnique({ where: { id: part.id } });
  const expectedPOSStock = expectedTicketStock - 3; // 8 - 3 = 5

  console.log(`   Expected Stock: ${expectedPOSStock}`);
  console.log(`   Actual Stock:   ${partAfterPOS?.quantity}`);

  if (partAfterPOS?.quantity === expectedPOSStock) {
    console.log('   ✅ PASS: POS Sale correctly discounted stock.');
  } else {
    console.log('   ❌ FAIL: POS Sale did not discount stock correctly.');
  }

  // 4. Verify POS Void (Should use trigger)
  console.log('\n4️⃣  Verifying POS Void (Restoration Trigger Test)...');

  await prisma.pOSSale.update({
    where: { id: sale.id },
    data: { status: 'VOIDED' }
  });

  const partAfterVoid = await prisma.part.findUnique({ where: { id: part.id } });
  const expectedVoidStock = expectedPOSStock + 3; // 5 + 3 = 8

  console.log(`   Expected Stock: ${expectedVoidStock}`);
  console.log(`   Actual Stock:   ${partAfterVoid?.quantity}`);

  if (partAfterVoid?.quantity === expectedVoidStock) {
    console.log('   ✅ PASS: POS Void correctly restored stock.');
  } else {
    console.log('   ❌ FAIL: POS Void did not restore stock.');
  }

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  await prisma.pOSSaleItem.deleteMany({ where: { saleId: sale.id } });
  await prisma.pOSSale.delete({ where: { id: sale.id } });
  await prisma.partUsage.deleteMany({ where: { ticketId: ticket.id } }); // This restores stock via trigger again!
  await prisma.ticket.delete({ where: { id: ticket.id } });
  await prisma.part.delete({ where: { id: part.id } });
  await prisma.customer.delete({ where: { id: customer.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.tenant.delete({ where: { id: tenant.id } });

  console.log('✅ Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
