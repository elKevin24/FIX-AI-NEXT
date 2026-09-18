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
export function formatCurrency(amount: number | null | undefined): string {
  const numericAmount = Number(amount) || 0;
  return `Q${numericAmount.toFixed(2)}`;
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

/**
 * Formatea fecha y hora en formato legible (ej. 16 sep 2026, 14:30).
 */
export function formatDateTime(date: Date | string | null | undefined, locale: string = 'es-GT'): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  CREDIT_NOTE: 'Nota de Crédito',
  OTHER: 'Otro',
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En Progreso',
  WAITING_FOR_PARTS: 'Esperando Repuestos',
  WAITING_APPROVAL: 'Esperando Aprobación',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
};

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  TECHNICIAN: 'Técnico',
  VIEWER: 'Visualizador',
};

export const CREDIT_NOTE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PROCESSED: 'Procesada',
  CANCELLED: 'Cancelada',
};
