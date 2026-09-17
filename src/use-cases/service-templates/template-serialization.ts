import { TicketPriority } from '@prisma/client';

/**
 * Convert template priority string to TicketPriority enum
 */
export function convertPriorityToEnum(priority: string): TicketPriority {
  const upperPriority = priority.toUpperCase();

  switch (upperPriority) {
    case 'LOW':
      return TicketPriority.LOW;
    case 'MEDIUM':
    case 'NORMAL':
      return TicketPriority.MEDIUM;
    case 'HIGH':
      return TicketPriority.HIGH;
    case 'URGENT':
      return TicketPriority.URGENT;
    default:
      return TicketPriority.MEDIUM;
  }
}

/**
 * Helper to serialize template with Prisma Decimals into plain numbers for JSON/Client boundaries
 */
export function serializeTemplate(template: any): any {
  if (!template) return template;
  return {
    ...template,
    laborCost: template.laborCost ? Number(template.laborCost) : null,
    defaultParts: template.defaultParts?.map((dp: any) => ({
      ...dp,
      part: dp.part ? {
        ...dp.part,
        price: dp.part.price ? Number(dp.part.price) : 0,
        cost: dp.part.cost ? Number(dp.part.cost) : null,
      } : dp.part,
    })),
  };
}
