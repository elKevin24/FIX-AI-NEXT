import { Prisma } from '@prisma/client';

/**
 * Convierte objetos Prisma.Decimal de Prisma a números simples de JavaScript.
 * Útil para pasar datos de Server Components a Client Components.
 */
export function serializeDecimal<T>(data: T): any {
  if (data === null || data === undefined) return data;

  if ((data as any) instanceof Prisma.Decimal || (data && typeof data === 'object' && 'd' in data && 'e' in data && 's' in data)) {
    return (data as unknown as Prisma.Decimal).toNumber();
  }

  if (Array.isArray(data)) {
    return data.map(item => serializeDecimal(item));
  }

  if (typeof data === 'object') {
    const serialized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        serialized[key] = serializeDecimal((data as any)[key]);
      }
    }
    return serialized;
  }

  return data;
}

/**
 * Formatea un valor numérico como moneda (ej. Q125.00 o $125.00).
 */
export function formatCurrency(amount: number | null | undefined, currency: string = 'Q'): string {
  const numericAmount = Number(amount) || 0;
  return `${currency}${numericAmount.toFixed(2)}`;
}

/**
 * Formatea una fecha en formato corto legible (ej. 16 sep 2026).
 */
export function formatDate(date: Date | string | null | undefined, locale: string = 'es-GT'): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
