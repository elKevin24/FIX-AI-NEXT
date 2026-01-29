
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';

// Iterador asíncrono que genera filas CSV bajo demanda
async function* makeIterator(tenantId: string, userId: string) {
  const db = getTenantPrisma(tenantId, userId);
  const BATCH_SIZE = 1000;
  let cursorId: string | undefined = undefined;

  // 1. Cabecera del CSV
  yield 'ID,Ticket Number,Title,Status,Priority,Created At\n';

  while (true) {
    // 2. Buscar lote pequeño (Cursor Pagination para eficiencia máxima)
    const batch: any[] = await db.ticket.findMany({
      take: BATCH_SIZE,
      skip: cursorId ? 1 : 0,
      cursor: cursorId ? { id: cursorId } : undefined,
      orderBy: { id: 'asc' }, // Crucial para cursor estable
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
      }
    });

    if (batch.length === 0) break;

    // 3. Convertir lote a string CSV y hacer "yield" (Stream)
    let chunk = '';
    for (const ticket of batch) {
      // Limpiar campos para CSV (escapar comillas, saltos de línea)
      const cleanTitle = ticket.title.replace(/"/g, '""').replace(/\n/g, ' ');
      chunk += `"${ticket.id}","${ticket.ticketNumber || ''}","${cleanTitle}","${ticket.status}","${ticket.priority}","${ticket.createdAt.toISOString()}"\n`;
    }

    yield chunk;

    // Actualizar cursor
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
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Crear el stream
  const iterator = makeIterator(session.user.tenantId, session.user.id);
  const stream = iteratorToStream(iterator);

  // Devolver respuesta con headers de descarga
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tickets-export-${new Date().toISOString().split('T')[0]}.csv"`,
      'Cache-Control': 'no-cache',
    },
  });
}
