/**
 * Interfaces TypeScript para el componente de Ticket 80mm
 * Basadas en el modelo Prisma existente
 * @author Senior Fullstack Developer
 */

export interface Ticket80mmCustomer {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    dpi: string | null;
    nit: string | null;
}

export interface Ticket80mmTenant {
    id: string;
    name: string;
}

export interface Ticket80mmAssignedUser {
    id: string;
    name: string | null;
    email: string;
}

export interface Ticket80mmPart {
    id: string;
    name: string;
    sku: string | null;
    cost: number | string;
    price: number | string;
    category: string | null;
}

export interface Ticket80mmPartUsage {
    id: string;
    quantity: number;
    part: Ticket80mmPart;
}

export interface Ticket80mmService {
    id: string;
    name: string;
    laborCost: number | string;
}

export interface Ticket80mmData {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string | null;
    deviceType: string | null;
    deviceModel: string | null;
    serialNumber: string | null;
    accessories: string | null;
    checkInNotes: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    estimatedCompletionDate: Date | string | null;
    dueDate: Date | string | null;
    customer: Ticket80mmCustomer;
    tenant: Ticket80mmTenant;
    assignedTo: Ticket80mmAssignedUser | null;
    partsUsed?: Ticket80mmPartUsage[];
    services?: Ticket80mmService[];
}

/**
 * Mapeo de estados para labels en español
 */
export const TICKET_STATUS_LABELS: Record<string, string> = {
    OPEN: 'Abierto',
    IN_PROGRESS: 'En Progreso',
    WAITING_FOR_PARTS: 'Esperando Repuestos',
    RESOLVED: 'Resuelto',
    CLOSED: 'Cerrado',
    CANCELLED: 'Cancelado',
} as const;

/**
 * Mapeo de prioridades para labels en español
 */
export const TICKET_PRIORITY_LABELS: Record<string, string> = {
    LOW: 'Baja',
    MEDIUM: 'Media',
    HIGH: 'Alta',
    URGENT: 'Urgente',
} as const;
