import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';

async function* makeQuotationsIterator(
  tenantId: string,
  userId: string,
  startDate?: string,
  endDate?: string,
  status?: string
) {
  const db = getTenantPrisma(tenantId, userId);
  const BATCH_SIZE = 1000;
  let cursorId: string | undefined = undefined;

  yield 'ID,Número de Cotización,Cliente,Email,Teléfono,Subtotal,IVA,Descuento,Total,Estado,Válida Hasta,Fecha Creación\n';

  while (true) {
    const batch: any[] = await db.pOSQuotation.findMany({
      take: BATCH_SIZE,
      skip: cursorId ? 1 : 0,
      cursor: cursorId ? { id: cursorId } : undefined,
      orderBy: { id: 'asc' },
      where: {
        ...(startDate && { createdAt: { gte: new Date(startDate) } }),
        ...(endDate && { createdAt: { lte: new Date(endDate + 'T23:59:59.999Z') } }),
        ...(status && { status: status as any }),
      },
      select: {
        id: true,
        quotationNumber: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        subtotal: true,
        taxAmount: true,
        discountAmount: true,
        total: true,
        status: true,
        validUntil: true,
        createdAt: true,
      },
    });

    if (batch.length === 0) break;

    let chunk = '';
    for (const q of batch) {
      const cleanName = (q.customerName || 'Consumidor Final').replace(/"/g, '""').replace(/\n/g, ' ');
      const cleanEmail = (q.customerEmail || '').replace(/"/g, '""');
      const cleanPhone = (q.customerPhone || '').replace(/"/g, '""');
      const subtotal = Number(q.subtotal);
      const tax = Number(q.taxAmount);
      const discount = Number(q.discountAmount);
      const total = Number(q.total);
      const validUntil = q.validUntil ? q.validUntil.toISOString().split('T')[0] : '';
      const fecha = q.createdAt.toISOString().split('T')[0];

      chunk += `"${q.id}","${q.quotationNumber}","${cleanName}","${cleanEmail}","${cleanPhone}",${subtotal.toFixed(2)},${tax.toFixed(2)},${discount.toFixed(2)},${total.toFixed(2)},"${q.status}","${validUntil}","${fecha}"\n`;
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

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const status = searchParams.get('status') || undefined;

  const iterator = makeQuotationsIterator(
    session.user.tenantId,
    session.user.id,
    startDate,
    endDate,
    status
  );
  const stream = iteratorToStream(iterator);
  const fecha = new Date().toISOString().split('T')[0];

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cotizaciones-${fecha}.csv"`,
      'Cache-Control': 'no-cache',
    },
  });
}
