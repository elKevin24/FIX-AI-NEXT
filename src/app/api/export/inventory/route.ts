import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';

async function* makeInventoryIterator(tenantId: string, userId: string) {
  const db = getTenantPrisma(tenantId, userId);
  const BATCH_SIZE = 1000;
  let cursorId: string | undefined = undefined;

  yield 'ID,Nombre,SKU,Stock Actual,Stock Mínimo,Costo,Precio,Total Valorizado\n';

  while (true) {
    const batch: any[] = await db.part.findMany({
      take: BATCH_SIZE,
      skip: cursorId ? 1 : 0,
      cursor: cursorId ? { id: cursorId } : undefined,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        minStock: true,
        cost: true,
        price: true,
      },
    });

    if (batch.length === 0) break;

    let chunk = '';
    for (const part of batch) {
      const cleanName = part.name.replace(/"/g, '""').replace(/\n/g, ' ');
      const sku = part.sku || '';
      const cost = Number(part.cost);
      const price = Number(part.price);
      const totalValue = cost * part.quantity;

      chunk += `"${part.id}","${cleanName}","${sku}",${part.quantity},${part.minStock},${cost.toFixed(2)},${price.toFixed(2)},${totalValue.toFixed(2)}\n`;
    }

    yield chunk;
    cursorId = batch[batch.length - 1].id;
  }
}

function iteratorToStream(iterator: any) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(new TextEncoder().encode(value));
      }
    },
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    return new Response('Forbidden: Insufficient permissions for data export', { status: 403 });
  }

  const iterator = makeInventoryIterator(session.user.tenantId, session.user.id);
  const stream = iteratorToStream(iterator);
  const fecha = new Date().toISOString().split('T')[0];

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="inventario-${fecha}.csv"`,
      'Cache-Control': 'no-cache',
    },
  });
}
