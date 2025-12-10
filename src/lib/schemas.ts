import { z } from 'zod';

// Esquema para la creación de un solo ticket (parte del flujo multi-dispositivo)
export const CreateTicketSchema = z.object({
  title: z.string().min(1, 'El título es requerido.').max(255, 'El título es demasiado largo.'),
  description: z.string().min(1, 'La descripción es requerida.').max(1000, 'La descripción es demasiado larga.'),
  customerName: z.string().min(1, 'El nombre del cliente es requerido.').max(255, 'El nombre del cliente es demasiado largo.'),
  
  // Nuevos campos del modelo Ticket (según schema.prisma)
  deviceType: z.string().max(50, 'El tipo de dispositivo es demasiado largo.').optional().nullable(),
  deviceModel: z.string().max(255, 'El modelo del dispositivo es demasiado largo.').optional().nullable(),
  serialNumber: z.string().max(255, 'El número de serie es demasiado largo.').optional().nullable(),
  accessories: z.string().optional().nullable(), // Se validará como JSON si se almacena como tal, o string si es un texto simple
  checkInNotes: z.string().max(500, 'Las notas de ingreso son demasiado largas.').optional().nullable(),
  // cancellationReason no es parte de la creación inicial
});

// Esquema para la creación de múltiples tickets (batch creation)
// Esto será un array de CreateTicketSchema, ya que cada elemento es un ticket individual.
export const CreateBatchTicketsSchema = z.array(CreateTicketSchema);

// Esquema para la actualización de un ticket (se podría expandir)
export const UpdateTicketSchema = z.object({
  ticketId: z.string().uuid('ID de ticket inválido.').min(1),
  title: z.string().min(1, 'El título es requerido.').max(255, 'El título es demasiado largo.').optional(),
  description: z.string().min(1, 'La descripción es requerida.').max(1000, 'La descripción es demasiado larga.').optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'RESOLVED', 'CLOSED', 'CANCELLED'], {
    errorMap: () => ({ message: 'Estado de ticket inválido.' })
  }).optional(),
  priority: z.string().max(50, 'La prioridad es demasiado larga.').optional().nullable(),
  assignedToId: z.string().uuid('ID de usuario asignado inválido.').optional().nullable(),
  // Nuevos campos que pueden ser actualizados
  deviceType: z.string().max(50, 'El tipo de dispositivo es demasiado largo.').optional().nullable(),
  deviceModel: z.string().max(255, 'El modelo del dispositivo es demasiado largo.').optional().nullable(),
  serialNumber: z.string().max(255, 'El número de serie es demasiado largo.').optional().nullable(),
  accessories: z.string().optional().nullable(),
  checkInNotes: z.string().max(500, 'Las notas de ingreso son demasiado largas.').optional().nullable(),
  cancellationReason: z.string().max(500, 'El motivo de cancelación es demasiado largo.').optional().nullable(),
});
