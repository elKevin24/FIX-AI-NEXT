import {
    draggable,
    dropTargetForElements,
    type ElementDragPayload,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';

export type TicketStatusColumn = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_PARTS' | 'WAITING_APPROVAL' | 'RESOLVED' | 'CLOSED';

export interface DragTicketData {
    [key: string | symbol]: unknown;
    type: 'TICKET_CARD';
    ticketId: string;
    ticketNumber?: string | null;
    currentStatus: TicketStatusColumn;
}

export interface DropColumnData {
    [key: string | symbol]: unknown;
    type: 'STATUS_COLUMN';
    targetStatus: TicketStatusColumn;
}

/**
 * Registra una tarjeta de ticket como elemento arrastrable.
 */
export function registerDraggableTicket({
    element,
    data,
    onDragStart,
    onDrop,
}: {
    element: HTMLElement;
    data: DragTicketData;
    onDragStart?: () => void;
    onDrop?: () => void;
}) {
    return draggable({
        element,
        getInitialData: () => data,
        onDragStart,
        onDrop,
    });
}

/**
 * Registra una columna como zona receptora (drop target) de tickets.
 */
export function registerStatusColumnDropTarget({
    element,
    targetStatus,
    onTicketDrop,
    onDragEnter,
    onDragLeave,
}: {
    element: HTMLElement;
    targetStatus: TicketStatusColumn;
    onTicketDrop: (ticketData: DragTicketData) => void;
    onDragEnter?: () => void;
    onDragLeave?: () => void;
}) {
    return dropTargetForElements({
        element,
        getData: (): DropColumnData => ({
            type: 'STATUS_COLUMN',
            targetStatus,
        }),
        canDrop: ({ source }) => {
            const data = source.data as Partial<DragTicketData>;
            return data.type === 'TICKET_CARD' && data.currentStatus !== targetStatus;
        },
        onDragEnter,
        onDragLeave,
        onDrop: ({ source }) => {
            const data = source.data as DragTicketData;
            if (data && data.type === 'TICKET_CARD') {
                onTicketDrop(data);
            }
        },
    });
}

export { combine };
