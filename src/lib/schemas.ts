import { z } from 'zod';
import { ServiceCategory } from '@prisma/client';

// ============================================================================
// TICKET SCHEMAS
// ============================================================================

// Esquema para uso de partes iniciales
const InitialPartSchema = z.object({
    partId: z.string().uuid('ID de repuesto inválido'),
    quantity: z.number().int().positive('La cantidad debe ser positiva')
});

// Esquema para la creación de un solo ticket (parte del flujo multi-dispositivo)
// NOTA: customerName se envía por separado en FormData, no dentro de cada ticket
export const CreateTicketSchema = z.object({
  title: z.string().min(1, 'El título es requerido.').max(255, 'El título es demasiado largo.'),
  description: z.string().min(1, 'La descripción es requerida.').max(1000, 'La descripción es demasiado larga.'),
  
  // Campos opcionales de estado y prioridad
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_PARTS'], {
    errorMap: () => ({ message: 'Estado inicial inválido.' })
  }).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
    errorMap: () => ({ message: 'Prioridad inválida.' })
  }).optional(),

  // Consumo inicial de inventario
  initialParts: z.array(InitialPartSchema).optional(),

  // Campos del dispositivo
  deviceType: z.string().max(50, 'El tipo de dispositivo es demasiado largo.').optional().nullable(),
  deviceModel: z.string().max(255, 'El modelo del dispositivo es demasiado largo.').optional().nullable(),
  serialNumber: z.string().max(255, 'El número de serie es demasiado largo.').optional().nullable(),
  accessories: z.string().optional().nullable(),
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

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const CreateUserSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['ADMIN', 'TECHNICIAN', 'RECEPTIONIST'], {
    errorMap: () => ({ message: 'Rol inválido' })
  }),
});

export const UpdateUserSchema = z.object({
  userId: z.string().uuid('ID de usuario inválido'),
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'TECHNICIAN', 'RECEPTIONIST'], {
    errorMap: () => ({ message: 'Rol inválido' })
  }),
});

// ============================================================================
// CUSTOMER SCHEMAS
// ============================================================================

export const CreateCustomerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Formato de email inválido').optional().or(z.literal('')),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  dpi: z.string().optional().nullable(),
  nit: z.string().optional().nullable(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.extend({
  customerId: z.string().uuid('ID de cliente inválido'),
});

// ============================================================================
// PART SCHEMAS
// ============================================================================

export const CreatePartSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  sku: z.string().optional().nullable(),
  quantity: z.number({ invalid_type_error: 'Cantidad inválida' }).int('La cantidad debe ser un entero').nonnegative('La cantidad no puede ser negativa'),
  cost: z.number({ invalid_type_error: 'Costo inválido' }).nonnegative('El costo no puede ser negativo'),
  price: z.number({ invalid_type_error: 'Precio inválido' }).nonnegative('El precio no puede ser negativo'),
});

export const UpdatePartSchema = CreatePartSchema.extend({
  partId: z.string().uuid('ID de repuesto inválido'),
});

// ============================================================================
// SERVICE TEMPLATE SCHEMAS
// ============================================================================

export const ServiceTemplateSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es demasiado largo'),
  category: z.nativeEnum(ServiceCategory, {
    errorMap: () => ({ message: 'Categoría inválida' }),
  }),
  defaultTitle: z.string().min(1, 'El título default es requerido').max(255, 'El título es demasiado largo'),
  defaultDescription: z.string().min(1, 'La descripción es requerida'),
  defaultPriority: z.enum(['Low', 'Medium', 'High', 'URGENT'], {
    errorMap: () => ({ message: 'Prioridad inválida' }),
  }),
  estimatedDuration: z.number().int().positive('La duración debe ser positiva').optional(),
  laborCost: z.number().nonnegative('El costo debe ser positivo o cero').optional(),
  isActive: z.boolean().optional().default(true),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color hexadecimal inválido').optional(),
  icon: z.string().max(10, 'Icono demasiado largo').optional(),
});

export const CreateServiceTemplateSchema = ServiceTemplateSchema;

export const UpdateServiceTemplateSchema = ServiceTemplateSchema.partial().required({
  name: true,
  category: true,
  defaultTitle: true,
  defaultDescription: true,
});

export const CreateTicketFromTemplateSchema = z.object({
  templateId: z.string().uuid('ID de plantilla inválido'),
  deviceType: z.string().max(50, 'El tipo de dispositivo es demasiado largo.').optional().nullable(),
  deviceModel: z.string().max(255, 'El modelo del dispositivo es demasiado largo.').optional().nullable(),
  customerId: z.string().uuid('ID de cliente inválido'),
  optionalParts: z.array(z.string().uuid()).optional(),
});

export const AddPartToTemplateSchema = z.object({
  templateId: z.string().uuid('ID de plantilla inválido'),
  partId: z.string().uuid('ID de repuesto inválido'),
  quantity: z.number().int('La cantidad debe ser un entero').positive('La cantidad debe ser positiva'),
  required: z.boolean(),
});

export const UpdateTemplateDefaultPartSchema = z.object({
  id: z.string().uuid('ID de parte por defecto inválido'),
  quantity: z.number().int('La cantidad debe ser un entero').positive('La cantidad debe ser positiva'),
  required: z.boolean(),
});