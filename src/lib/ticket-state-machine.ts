/**
 * Ticket State Machine - Validación de transiciones de estado
 *
 * Define las transiciones válidas entre estados de tickets y
 * proporciona validación centralizada para prevenir estados inconsistentes.
 */

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_PARTS = 'WAITING_FOR_PARTS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export type TicketAction =
  | 'take'
  | 'assign'
  | 'start'
  | 'wait_for_parts'
  | 'resume'
  | 'resolve'
  | 'deliver'
  | 'cancel'
  | 'reopen';

/**
 * Mapa de transiciones válidas: [estado_actual][acción] -> estado_nuevo
 */
const VALID_TRANSITIONS: Record<TicketStatus, Partial<Record<TicketAction, TicketStatus>>> = {
  [TicketStatus.OPEN]: {
    take: TicketStatus.IN_PROGRESS,
    assign: TicketStatus.IN_PROGRESS,
    cancel: TicketStatus.CANCELLED,
  },
  [TicketStatus.IN_PROGRESS]: {
    wait_for_parts: TicketStatus.WAITING_FOR_PARTS,
    resolve: TicketStatus.RESOLVED,
    cancel: TicketStatus.CANCELLED,
  },
  [TicketStatus.WAITING_FOR_PARTS]: {
    resume: TicketStatus.IN_PROGRESS,
    cancel: TicketStatus.CANCELLED,
  },
  [TicketStatus.RESOLVED]: {
    deliver: TicketStatus.CLOSED,
    reopen: TicketStatus.IN_PROGRESS,
    cancel: TicketStatus.CANCELLED,
  },
  [TicketStatus.CLOSED]: {
    reopen: TicketStatus.IN_PROGRESS,
  },
  [TicketStatus.CANCELLED]: {
    reopen: TicketStatus.OPEN,
  },
};

/**
 * Valida si una transición de estado es permitida
 */
export function isValidTransition(
  currentStatus: TicketStatus,
  action: TicketAction
): boolean {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  return allowedTransitions?.[action] !== undefined;
}

/**
 * Obtiene el nuevo estado basado en el estado actual y la acción
 * @throws Error si la transición no es válida
 */
export function getNextStatus(
  currentStatus: TicketStatus,
  action: TicketAction
): TicketStatus {
  const nextStatus = VALID_TRANSITIONS[currentStatus]?.[action];

  if (!nextStatus) {
    throw new Error(
      `Invalid transition: Cannot perform action '${action}' on ticket with status '${currentStatus}'`
    );
  }

  return nextStatus;
}

/**
 * Obtiene todas las acciones válidas para un estado dado
 */
export function getValidActions(currentStatus: TicketStatus): TicketAction[] {
  const transitions = VALID_TRANSITIONS[currentStatus];
  return Object.keys(transitions || {}) as TicketAction[];
}

/**
 * Describe la transición en lenguaje natural
 */
export function describeTransition(
  currentStatus: TicketStatus,
  action: TicketAction
): string {
  const descriptions: Record<string, string> = {
    'OPEN->take': 'Técnico toma el ticket y comienza a trabajar',
    'OPEN->assign': 'Admin asigna el ticket a un técnico',
    'OPEN->cancel': 'Ticket cancelado sin iniciar trabajo',
    'IN_PROGRESS->wait_for_parts': 'Trabajo pausado esperando repuestos',
    'IN_PROGRESS->resolve': 'Reparación completada',
    'IN_PROGRESS->cancel': 'Ticket cancelado durante el trabajo',
    'WAITING_FOR_PARTS->resume': 'Repuestos llegaron, se reanuda el trabajo',
    'WAITING_FOR_PARTS->cancel': 'Ticket cancelado mientras esperaba repuestos',
    'RESOLVED->deliver': 'Dispositivo entregado al cliente',
    'RESOLVED->reopen': 'Cliente rechaza la reparación, se reabre',
    'RESOLVED->cancel': 'Ticket cancelado después de resolver',
    'CLOSED->reopen': 'Cliente reporta nuevo problema, se reabre',
    'CANCELLED->reopen': 'Ticket cancelado se reactiva',
  };

  const key = `${currentStatus}->${action}`;
  return descriptions[key] || `Transición de ${currentStatus} mediante ${action}`;
}
