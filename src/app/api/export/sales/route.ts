import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';

async function* makeSalesIterator(
  tenantId: string,
  userId: string,
  startDate?: string,
  endDate?: string
) {
  const db = getTenantPrisma(tenantId, userId);
  const BATCH_SIZE = 1000;
  let cursorId: string | undefined = undefined;

  yield 'ID Venta,Número de Ticket,Cliente,Método de Pago,Subtotal,Descuento,Total,Fecha\n';

  while (true) {
    const batch: any[] = await db.pOSSale.findMany({
      take: BATCH_SIZE,
      skip: cursorId ? 1 : 0,
      cursor: cursorId ? { id: cursorId } : undefined,
      orderBy: { id: 'asc' },
      where: {
        ...(startDate && { createdAt: { gte: new Date(startDate) } }),
        ...(endDate && { createdAt: { lte: new Date(endDate + 'T23:59:59.999Z') } }),
      },
      select: {
        id: true,
        saleNumber: true,
        customerName: true,
        subtotal: true,
        discountAmount: true,
        total: true,
        createdAt: true,
        payments: {
          select: { method: true },
          take: 1,
        },
      },
    });

    if (batch.length === 0) break;

    let chunk = '';
    for (const sale of batch) {
      const cleanCustomer = (sale.customerName || 'Consumidor Final').replace(/"/g, '""').replace(/\n/g, ' ');
      const paymentMethod = sale.payments?.[0]?.method || 'N/A';
      const subtotal = Number(sale.subtotal);
      const discount = Number(sale.discountAmount);
      const total = Number(sale.total);
      const fecha = sale.createdAt.toISOString().split('T')[0];

      chunk += `"${sale.id}","${sale.saleNumber || ''}","${cleanCustomer}","${paymentMethod}",${subtotal.toFixed(2)},${discount.toFixed(2)},${total.toFixed(2)},"${fecha}"\n`;
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

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  const iterator = makeSalesIterator(
    session.user.tenantId,
    session.user.id,
    startDate,
    endDate
  );
  const stream = iteratorToStream(iterator);
  const fecha = new Date().toISOString().split('T')[0];

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ventas-${fecha}.csv"`,
      'Cache-Control': 'no-cache',
    },
  });
}
