import { Decimal } from '@prisma/client/runtime/library';

/**
 * Convierte objetos Decimal de Prisma a números simples de JavaScript.
 * Útil para pasar datos de Server Components a Client Components.
 */
export function serializeDecimal<T>(data: T): any {
  if (data === null || data === undefined) return data;

  if (data instanceof Decimal) {
    return data.toNumber();
  }

  if (Array.isArray(data)) {
    return data.map(item => serializeDecimal(item));
  }

  if (typeof data === 'object' && data !== null) {
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
