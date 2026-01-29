
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { Prisma } from '@prisma/client';

export type SearchResult = {
  type: 'CUSTOMER' | 'TICKET' | 'PART';
  id: string;
  title: string;
  subtitle: string;
  status?: string;
  score: number;
  url: string;
};

/**
 * Realiza una búsqueda inteligente (Fuzzy Search) en múltiples entidades.
 * Utiliza índices GIN y pg_trgm para velocidad y tolerancia a errores.
 */
export async function globalSmartSearch(query: string): Promise<SearchResult[]> {
  const session = await auth();
  if (!session?.user?.tenantId) return [];

  const tenantId = session.user.tenantId;
  const sanitizedQuery = query.trim();

  if (sanitizedQuery.length < 2) return [];

  const db = getTenantPrisma(tenantId, session.user.id);

  // Umbral de similitud (0 a 1). 0.3 es permisivo, 0.1 es muy permisivo.
  // pg_trgm por defecto usa 0.3
  
  // Consulta a CLIENTES
  // Buscamos por nombre, email, teléfono o NIT
  // La función similarity() devuelve un score de coincidencia
  const customersPromise = db.$queryRaw<{ id: string; name: string; email: string | null; phone: string | null; score: number }[]>`
    SELECT 
      id, 
      name, 
      email, 
      phone,
      (
        CASE 
          WHEN name ILIKE ${'%' + sanitizedQuery + '%'} THEN 1.0
          ELSE GREATEST(
            similarity(name, ${sanitizedQuery}), 
            similarity(COALESCE(email, ''), ${sanitizedQuery}),
            similarity(COALESCE(phone, ''), ${sanitizedQuery})
          )
        END
      ) as score
    FROM customers
    WHERE "tenantId" = ${tenantId}
      AND (
        name % ${sanitizedQuery} OR 
        name ILIKE ${'%' + sanitizedQuery + '%'} OR
        email ILIKE ${'%' + sanitizedQuery + '%'} OR 
        phone ILIKE ${'%' + sanitizedQuery + '%'} OR
        nit ILIKE ${'%' + sanitizedQuery + '%'}
      )
    ORDER BY score DESC
    LIMIT 5;
  `;

  // Consulta a TICKETS
  // Buscamos por título, número, descripción o serial
  const ticketsPromise = db.$queryRaw<{ id: string; ticketNumber: string | null; title: string; status: string; deviceModel: string | null; score: number }[]>`
    SELECT 
      id, 
      "ticketNumber", 
      title, 
      status,
      "deviceModel",
      (
        CASE 
          WHEN title ILIKE ${'%' + sanitizedQuery + '%'} THEN 1.0
          WHEN "ticketNumber" ILIKE ${'%' + sanitizedQuery + '%'} THEN 1.0
          ELSE GREATEST(
            similarity(title, ${sanitizedQuery}), 
            similarity(COALESCE("ticketNumber", ''), ${sanitizedQuery}),
            similarity(COALESCE("deviceModel", ''), ${sanitizedQuery})
          )
        END
      ) as score
    FROM tickets
    WHERE "tenantId" = ${tenantId}
      AND (
        title % ${sanitizedQuery} OR 
        title ILIKE ${'%' + sanitizedQuery + '%'} OR
        "ticketNumber" ILIKE ${'%' + sanitizedQuery + '%'} OR 
        description ILIKE ${'%' + sanitizedQuery + '%'} OR
        "serialNumber" ILIKE ${'%' + sanitizedQuery + '%'}
      )
    ORDER BY score DESC
    LIMIT 5;
  `;

  // Consulta a REPUESTOS (Parts)
  // Buscamos por nombre o SKU
  const partsPromise = db.$queryRaw<{ id: string; name: string; sku: string | null; quantity: number; score: number }[]>`
    SELECT 
      id, 
      name, 
      sku, 
      quantity,
      (
        CASE 
          WHEN name ILIKE ${'%' + sanitizedQuery + '%'} THEN 1.0
          WHEN sku ILIKE ${'%' + sanitizedQuery + '%'} THEN 1.0
          ELSE GREATEST(
            similarity(name, ${sanitizedQuery}), 
            similarity(COALESCE(sku, ''), ${sanitizedQuery})
          )
        END
      ) as score
    FROM parts
    WHERE "tenantId" = ${tenantId}
      AND (
        name % ${sanitizedQuery} OR 
        name ILIKE ${'%' + sanitizedQuery + '%'} OR
        sku ILIKE ${'%' + sanitizedQuery + '%'}
      )
    ORDER BY score DESC
    LIMIT 5;
  `;

  const [customers, tickets, parts] = await Promise.all([
    customersPromise,
    ticketsPromise,
    partsPromise
  ]);

  // Normalizar resultados
  const results: SearchResult[] = [];

  customers.forEach((c: any) => {
    results.push({
      type: 'CUSTOMER',
      id: c.id,
      title: c.name,
      subtitle: c.email || c.phone || 'Sin contacto',
      score: c.score,
      url: `/dashboard/customers/${c.id}`
    });
  });

  tickets.forEach((t: any) => {
    results.push({
      type: 'TICKET',
      id: t.id,
      title: `Ticket ${t.ticketNumber || 'N/A'}: ${t.title}`,
      subtitle: `${t.deviceModel || 'Dispositivo'} - ${t.status}`,
      status: t.status,
      score: t.score,
      url: `/dashboard/tickets/${t.id}`
    });
  });

  parts.forEach((p: any) => {
    results.push({
      type: 'PART',
      id: p.id,
      title: p.name,
      subtitle: `SKU: ${p.sku || 'N/A'} | Stock: ${p.quantity}`,
      score: p.score,
      url: `/dashboard/parts?search=${encodeURIComponent(p.name)}` // Link al buscador de inventario
    });
  });

  // Ordenar globalmente por score
  return results.sort((a, b) => b.score - a.score);
}
