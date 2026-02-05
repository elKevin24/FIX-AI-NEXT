'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
import { ServiceCategory, TicketPriority } from '@/generated/prisma';
import { notifyLowStock } from './ticket-notifications';
import { notifyTicketCreated } from '@/lib/ticket-notifications';
import {
  CreateServiceTemplateSchema,
  UpdateServiceTemplateSchema,
  CreateTicketFromTemplateSchema,
  AddPartToTemplateSchema,
  UpdateTemplateDefaultPartSchema
} from './schemas';

// ============================================================================
// TYPES
// ============================================================================

export type ServiceTemplateFormData = {
  name: string;
  category: ServiceCategory;
  defaultTitle: string;
  defaultDescription: string;
  defaultPriority: string;
  estimatedDuration?: number;
  laborCost?: number;
  isActive?: boolean;
  color?: string;
  icon?: string;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert template priority string to TicketPriority enum
 * Template priorities use mixed case (Low, Medium, High, URGENT)
 * Database enum uses uppercase (LOW, MEDIUM, HIGH, URGENT)
 */
function convertPriorityToEnum(priority: string): TicketPriority {
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
      return TicketPriority.MEDIUM; // Default fallback
  }
}

// ============================================================================
// GET ALL TEMPLATES
// ============================================================================

export async function getServiceTemplates() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const templates = await db.serviceTemplate.findMany({
    include: {
      defaultParts: {
        include: {
          part: true,
        },
      },
      _count: {
        select: {
          tickets: true,
        },
      },
    },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' },
    ],
  });

  return templates;
}

// ============================================================================
// GET ACTIVE TEMPLATES (for ticket creation)
// ============================================================================

export async function getActiveServiceTemplates() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const templates = await db.serviceTemplate.findMany({
    where: {
      isActive: true,
    },
    include: {
      defaultParts: {
        include: {
          part: true,
        },
      },
    },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' },
    ],
  });

  return templates;
}

// ============================================================================
// GET SINGLE TEMPLATE
// ============================================================================

export async function getServiceTemplate(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const template = await db.serviceTemplate.findUnique({
    where: {
      id,
    },
    include: {
      defaultParts: {
        include: {
          part: true,
        },
      },
      _count: {
        select: {
          tickets: true,
        },
      },
    },
  });

  if (!template) {
    throw new Error('Plantilla no encontrada');
  }

  // Double check tenant ownership just in case, though client should enforce it
  if (template.tenantId !== session.user.tenantId) {
     throw new Error('Acceso denegado');
  }

  return template;
}

// ============================================================================
// CREATE TEMPLATE
// ============================================================================

export async function createServiceTemplate(formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  // Solo ADMIN puede crear plantillas
  if (session.user.role !== 'ADMIN') {
    throw new Error('Permiso denegado. Solo administradores pueden crear plantillas.');
  }

  const formDataObj = Object.fromEntries(formData);

  // Convert numerical fields from string to number for Zod validation
  const dataToValidate = {
    ...formDataObj,
    estimatedDuration: formDataObj.estimatedDuration ? Number(formDataObj.estimatedDuration) : undefined,
    laborCost: formDataObj.laborCost ? Number(formDataObj.laborCost) : undefined,
    isActive: formDataObj.isActive === 'true', // Convert string 'true' to boolean true
  };

  const validatedFields = CreateServiceTemplateSchema.safeParse(dataToValidate);

  if (!validatedFields.success) {
    throw new Error(`Error de validación: ${validatedFields.error.errors[0].message}`);
  }

  const data = validatedFields.data;

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const template = await db.serviceTemplate.create({
    data: {
      ...data,
      laborCost: data.laborCost ? Number(data.laborCost) : null,
      tenantId: session.user.tenantId,
      createdById: session.user.id,
      updatedById: session.user.id,
    },
  });

  revalidatePath('/dashboard/settings/service-templates');
  return template;
}

// ============================================================================
// UPDATE TEMPLATE
// ============================================================================

export async function updateServiceTemplate(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  // Solo ADMIN puede editar completamente
  if (session.user.role !== 'ADMIN') {
    throw new Error('Permiso denegado');
  }

  const formDataObj = Object.fromEntries(formData);
  const dataToValidate = {
    ...formDataObj,
    estimatedDuration: formDataObj.estimatedDuration ? Number(formDataObj.estimatedDuration) : undefined,
    laborCost: formDataObj.laborCost ? Number(formDataObj.laborCost) : undefined,
    isActive: formDataObj.isActive === 'true', // Convert string 'true' to boolean true
  };

  const validatedFields = UpdateServiceTemplateSchema.safeParse(dataToValidate);

  if (!validatedFields.success) {
    throw new Error(`Error de validación: ${validatedFields.error.errors[0].message}`);
  }

  const data = validatedFields.data;

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Verificar que la plantilla pertenece al tenant
  const existingTemplate = await db.serviceTemplate.findUnique({
    where: { id },
  });

  if (!existingTemplate || existingTemplate.tenantId !== session.user.tenantId) {
    throw new Error('Plantilla no encontrada');
  }

  const template = await db.serviceTemplate.update({
    where: { id },
    data: {
      ...data,
      laborCost: data.laborCost ? Number(data.laborCost) : null,
      updatedById: session.user.id,
    },
  });

  revalidatePath('/dashboard/settings/service-templates');
  revalidatePath(`/dashboard/settings/service-templates/${id}`);
  return template;
}

// ============================================================================
// TOGGLE ACTIVE STATUS
// ============================================================================

export async function toggleTemplateActiveStatus(id: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  // Solo ADMIN puede activar/desactivar
  if (session.user.role !== 'ADMIN') {
    throw new Error('Permiso denegado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Verificar que la plantilla pertenece al tenant
  const existingTemplate = await db.serviceTemplate.findUnique({
    where: { id },
  });

  if (!existingTemplate || existingTemplate.tenantId !== session.user.tenantId) {
    throw new Error('Plantilla no encontrada');
  }

  const template = await db.serviceTemplate.update({
    where: { id },
    data: {
      isActive,
      updatedById: session.user.id,
    },
  });

  revalidatePath('/dashboard/settings/service-templates');
  return template;
}

// ============================================================================
// DELETE TEMPLATE
// ============================================================================

export async function deleteServiceTemplate(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  // Solo ADMIN puede eliminar
  if (session.user.role !== 'ADMIN') {
    throw new Error('Permiso denegado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Verificar que la plantilla pertenece al tenant
  const existingTemplate = await db.serviceTemplate.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          tickets: true,
        },
      },
    },
  });

  if (!existingTemplate || existingTemplate.tenantId !== session.user.tenantId) {
    throw new Error('Plantilla no encontrada');
  }

  // Advertencia si tiene tickets asociados
  if (existingTemplate._count.tickets > 0) {
    throw new Error(
      `No se puede eliminar. Esta plantilla tiene ${existingTemplate._count.tickets} tickets asociados.`
    );
  }

  await db.serviceTemplate.delete({
    where: { id },
  });

  revalidatePath('/dashboard/settings/service-templates');
  return { success: true };
}

// ============================================================================
// DUPLICATE TEMPLATE
// ============================================================================

export async function duplicateServiceTemplate(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  // Solo ADMIN puede duplicar
  if (session.user.role !== 'ADMIN') {
    throw new Error('Permiso denegado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Obtener plantilla original
  const original = await db.serviceTemplate.findUnique({
    where: { id },
    include: {
      defaultParts: true,
    },
  });

  if (!original || original.tenantId !== session.user.tenantId) {
    throw new Error('Plantilla no encontrada');
  }

  // Crear copia
  const duplicate = await db.serviceTemplate.create({
    data: {
      name: `${original.name} (Copia)`,
      category: original.category,
      defaultTitle: original.defaultTitle,
      defaultDescription: original.defaultDescription,
      defaultPriority: original.defaultPriority,
      estimatedDuration: original.estimatedDuration,
      laborCost: original.laborCost,
      isActive: false, // Las copias empiezan inactivas
      color: original.color,
      icon: original.icon,
      tenantId: session.user.tenantId,
      createdById: session.user.id,
      updatedById: session.user.id,
      defaultParts: {
        create: original.defaultParts.map((dp: { partId: string; quantity: number; required: boolean }) => ({
          partId: dp.partId,
          quantity: dp.quantity,
          required: dp.required,
        })),
      },
    },
  });

  revalidatePath('/dashboard/settings/service-templates');
  return duplicate;
}

// ============================================================================
// CREATE TICKET FROM TEMPLATE
// ============================================================================

export async function createTicketFromTemplate(formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const formDataObj = Object.fromEntries(formData);
  
  let optionalParts: string[] | undefined;
  try {
      const raw = formData.get('optionalParts');
      if (raw && typeof raw === 'string') optionalParts = JSON.parse(raw);
  } catch (e) {}

  const validatedFields = CreateTicketFromTemplateSchema.safeParse({ ...formDataObj, optionalParts });

  if (!validatedFields.success) {
    throw new Error(`Error de validación: ${validatedFields.error.errors[0].message}`);
  }

  const { templateId, deviceType, deviceModel, customerId, optionalParts: selectedOptionalPartIds } = validatedFields.data;

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Obtener plantilla con partes requeridas
  const template = await db.serviceTemplate.findUnique({
    where: { id: templateId },
    include: {
      defaultParts: {
        include: {
          part: true,
        },
      },
    },
  });

  if (!template || template.tenantId !== session.user.tenantId) {
    throw new Error('Plantilla no encontrada');
  }

  if (!template.isActive) {
    throw new Error('Esta plantilla está inactiva');
  }

  // Validar que customer pertenece al tenant (CRITICAL: tenant isolation)
  const customer = await db.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer || customer.tenantId !== session.user.tenantId) {
    throw new Error('Cliente no encontrado o no pertenece a tu organización');
  }

  // ATOMIC TRANSACTION: Crear ticket y consumir stock automáticamente
  const ticket = await db.$transaction(async (tx: any) => {
    // 1. Crear el ticket
    const newTicket = await tx.ticket.create({
      data: {
        title: template.defaultTitle,
        description: template.defaultDescription,
        priority: convertPriorityToEnum(template.defaultPriority),
        deviceType: deviceType || 'PC',
        deviceModel: deviceModel || '',
        customerId,
        tenantId: session.user.tenantId,
        serviceTemplateId: templateId,
        // Asignar automáticamente si el usuario es técnico
        // Calcular DueDate basado en estimatedDuration
        dueDate: template.estimatedDuration ? new Date(Date.now() + template.estimatedDuration * 60000) : undefined,
        estimatedCompletionDate: template.estimatedDuration ? new Date(Date.now() + template.estimatedDuration * 60000) : undefined,
        assignedToId:
          session.user.role === 'TECHNICIAN' ? session.user.id : undefined,
        createdById: session.user.id,
        updatedById: session.user.id,
      },
    });

    // 2. Procesar partes REQUERIDAS con consumo atómico de stock
    const requiredParts = template.defaultParts.filter((dp: any) => dp.required);

    for (const defaultPart of requiredParts) {
      // Check stock (Trigger enforces it too, but we check for clear error)
      const part = await tx.part.findUnique({ where: { id: defaultPart.partId } });
      
      if (!part || part.quantity < defaultPart.quantity) {
        throw new Error(
          `Stock insuficiente para ${defaultPart.part.name}. ` +
            `Disponible: ${part?.quantity || 0}, Requerido: ${defaultPart.quantity}`
        );
      }

      // Registrar uso de parte
      await tx.partUsage.create({
        data: {
          ticketId: newTicket.id,
          partId: defaultPart.partId,
          quantity: defaultPart.quantity,
        },
      });

      // Check for low stock and notify admins
      const updatedPart = await tx.part.findUnique({
        where: { id: defaultPart.partId },
        select: { id: true, name: true, quantity: true, minStock: true, tenantId: true }
      });

      if (updatedPart && updatedPart.quantity <= updatedPart.minStock) {
        const admins = await tx.user.findMany({
          where: {
            tenantId: updatedPart.tenantId,
            role: 'ADMIN',
          },
          select: { id: true }
        });

        const adminIds = admins.map((a: { id: string }) => a.id);
        await notifyLowStock(updatedPart.tenantId, updatedPart, adminIds);
      }
    }

    // 3. Agregar partes OPCIONALES seleccionadas
    const optionalParts = template.defaultParts.filter((dp: any) => !dp.required);

    if (optionalParts.length > 0 && selectedOptionalPartIds) {
      for (const optionalPart of optionalParts) {
        // Verificar si el usuario seleccionó esta parte opcional
        if (selectedOptionalPartIds.includes(optionalPart.partId)) {
           // Verificar stock y consumir (igual que requeridas)
           const part = await tx.part.findUnique({
             where: { id: optionalPart.partId },
           });

           if (!part || part.quantity < optionalPart.quantity) {
             throw new Error(
               `Stock insuficiente para parte opcional ${part?.name || 'desconocida'}. ` +
               `Disponible: ${part?.quantity || 0}, Requerido: ${optionalPart.quantity}`
             );
           }
           
           // Decrementar stock
           await tx.part.update({
             where: { id: optionalPart.partId },
             data: { quantity: { decrement: optionalPart.quantity } }
           });

           // Registrar uso
           await tx.partUsage.create({
             data: {
               ticketId: newTicket.id,
               partId: optionalPart.partId,
               quantity: optionalPart.quantity,
             },
           });
        }
      }
    }

    return newTicket;
  });

  // Fetch the created ticket with customer data for notifications
  const ticketWithCustomer = await db.ticket.findUnique({
    where: { id: ticket.id },
    include: {
      customer: true,
      assignedTo: true,
    },
  });

  // Send notification to customer about ticket creation
  if (ticketWithCustomer) {
    try {
      await notifyTicketCreated({
        id: ticketWithCustomer.id,
        ticketNumber: ticketWithCustomer.ticketNumber,
        title: ticketWithCustomer.title,
        deviceType: ticketWithCustomer.deviceType,
        deviceModel: ticketWithCustomer.deviceModel,
        status: ticketWithCustomer.status,
        customerId: ticketWithCustomer.customerId,
        customer: {
          id: ticketWithCustomer.customer.id,
          name: ticketWithCustomer.customer.name,
          email: ticketWithCustomer.customer.email,
        },
        assignedTo: ticketWithCustomer.assignedTo,
        tenantId: ticketWithCustomer.tenantId,
      });
    } catch (notificationError) {
      // Log notification errors but don't fail the request
      console.error('Failed to send ticket creation notification:', notificationError);
    }
  }

  revalidatePath('/dashboard/tickets');
  revalidatePath(`/dashboard/tickets/${ticket.id}`);
  return ticket;
}

// ============================================================================
// GET AVAILABLE PARTS
// ============================================================================

export async function getAvailableParts() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const parts = await db.part.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  return parts;
}

// ============================================================================
// MANAGE TEMPLATE DEFAULT PARTS
// ============================================================================

export async function addPartToTemplate(formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  if (session.user.role !== 'ADMIN') {
    throw new Error('Permiso denegado');
  }

  const formDataObj = Object.fromEntries(formData);
  const dataToValidate = {
    ...formDataObj,
    quantity: Number(formDataObj.quantity),
    required: formDataObj.required === 'true',
  };

  const validatedFields = AddPartToTemplateSchema.safeParse(dataToValidate);

  if (!validatedFields.success) {
    throw new Error(`Error de validación: ${validatedFields.error.errors[0].message}`);
  }

  const { templateId, partId, quantity, required } = validatedFields.data;

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Verificar que la plantilla pertenece al tenant
  const template = await db.serviceTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template || template.tenantId !== session.user.tenantId) {
    throw new Error('Plantilla no encontrada');
  }

  // Verificar que la parte pertenece al tenant
  const part = await db.part.findUnique({
    where: { id: partId },
  });

  if (!part || part.tenantId !== session.user.tenantId) {
    throw new Error('Parte no encontrada');
  }

  // Verificar si ya existe
  const existing = await db.templateDefaultPart.findFirst({
    where: {
      templateId,
      partId,
    },
  });

  if (existing) {
    throw new Error('Esta parte ya está agregada a la plantilla');
  }

  const defaultPart = await db.templateDefaultPart.create({
    data: {
      templateId,
      partId,
      quantity,
      required,
    },
    include: {
      part: true,
    },
  });

  revalidatePath('/dashboard/settings/service-templates');
  revalidatePath(`/dashboard/settings/service-templates/${templateId}/edit`);
  return defaultPart;
}

export async function updateTemplateDefaultPart(formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  if (session.user.role !== 'ADMIN') {
    throw new Error('Permiso denegado');
  }

  const formDataObj = Object.fromEntries(formData);
  const dataToValidate = {
    ...formDataObj,
    id: formDataObj.id, // Assuming 'id' is passed as a hidden field
    quantity: Number(formDataObj.quantity),
    required: formDataObj.required === 'true',
  };

  const validatedFields = UpdateTemplateDefaultPartSchema.safeParse(dataToValidate);

  if (!validatedFields.success) {
    throw new Error(`Error de validación: ${validatedFields.error.errors[0].message}`);
  }

  const { id, quantity, required } = validatedFields.data;

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Verificar que existe y pertenece al tenant
  const defaultPart = await db.templateDefaultPart.findUnique({
    where: { id },
    include: {
      template: true,
    },
  });

  if (!defaultPart || defaultPart.template.tenantId !== session.user.tenantId) {
    throw new Error('Parte de plantilla no encontrada');
  }

  const updated = await db.templateDefaultPart.update({
    where: { id },
    data: {
      quantity,
      required,
    },
    include: {
      part: true,
    },
  });

  revalidatePath('/dashboard/settings/service-templates');
  revalidatePath(`/dashboard/settings/service-templates/${defaultPart.templateId}/edit`);
  return updated;
}

export async function removePartFromTemplate(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  if (session.user.role !== 'ADMIN') {
    throw new Error('Permiso denegado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Verificar que existe y pertenece al tenant
  const defaultPart = await db.templateDefaultPart.findUnique({
    where: { id },
    include: {
      template: true,
    },
  });

  if (!defaultPart || defaultPart.template.tenantId !== session.user.tenantId) {
    throw new Error('Parte de plantilla no encontrada');
  }

  await db.templateDefaultPart.delete({
    where: { id },
  });

  revalidatePath('/dashboard/settings/service-templates');
  revalidatePath(`/dashboard/settings/service-templates/${defaultPart.templateId}/edit`);
  return { success: true };
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface TemplateAnalytics {
  summary: {
    totalTemplates: number;
    activeTemplates: number;
    totalTicketsCreated: number;
    totalRevenueFromTemplates: number;
  };
  templateUsage: {
    id: string;
    name: string;
    category: ServiceCategory;
    icon: string | null;
    color: string | null;
    ticketCount: number;
    lastUsed: Date | null;
    laborCost: number;
    totalRevenue: number;
  }[];
  categoryBreakdown: {
    category: ServiceCategory;
    count: number;
    ticketCount: number;
    revenue: number;
  }[];
  recentActivity: {
    id: string;
    ticketNumber: string | null;
    title: string;
    templateName: string;
    templateIcon: string | null;
    customerName: string;
    createdAt: Date;
    status: string;
  }[];
  monthlyTrend: {
    month: string;
    ticketCount: number;
    revenue: number;
  }[];
}

export async function getTemplateAnalytics(startDate?: Date, endDate?: Date): Promise<TemplateAnalytics> {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  if (session.user.role !== 'ADMIN') {
    throw new Error('Permiso denegado');
  }

  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  // Default to last 30 days if no dates provided
  const end = endDate || new Date();
  const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get all templates with ticket counts
  const templates = await db.serviceTemplate.findMany({
    include: {
      tickets: {
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        select: {
          id: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          tickets: true,
        },
      },
    },
  });

  // Get recent tickets created from templates
  const recentTickets = await db.ticket.findMany({
    where: {
      serviceTemplateId: { not: null },
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      serviceTemplate: {
        select: {
          name: true,
          icon: true,
        },
      },
      customer: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  // Calculate summary
  const activeTemplates = templates.filter((t: typeof templates[0]) => t.isActive);
  const totalTicketsFromTemplates = templates.reduce((sum: number, t: typeof templates[0]) => sum + t.tickets.length, 0);
  const totalRevenue = templates.reduce((sum: number, t: typeof templates[0]) => {
    const laborCost = t.laborCost ? Number(t.laborCost) : 0;
    return sum + (laborCost * t.tickets.length);
  }, 0);

  // Template usage stats
  const templateUsage = templates.map((t: typeof templates[0]) => {
    const ticketDates = t.tickets.map((ticket: { id: string; createdAt: Date }) => ticket.createdAt);
    const lastUsed = ticketDates.length > 0
      ? new Date(Math.max(...ticketDates.map((d: Date) => d.getTime())))
      : null;

    const laborCost = t.laborCost ? Number(t.laborCost) : 0;

    return {
      id: t.id,
      name: t.name,
      category: t.category,
      icon: t.icon,
      color: t.color,
      ticketCount: t.tickets.length,
      lastUsed,
      laborCost,
      totalRevenue: laborCost * t.tickets.length,
    };
  }).sort((a: { ticketCount: number }, b: { ticketCount: number }) => b.ticketCount - a.ticketCount);

  // Category breakdown
  const categoryMap = new Map<ServiceCategory, { count: number; ticketCount: number; revenue: number }>();
  for (const t of templates) {
    const existing = categoryMap.get(t.category) || { count: 0, ticketCount: 0, revenue: 0 };
    const laborCost = t.laborCost ? Number(t.laborCost) : 0;
    categoryMap.set(t.category, {
      count: existing.count + 1,
      ticketCount: existing.ticketCount + t.tickets.length,
      revenue: existing.revenue + (laborCost * t.tickets.length),
    });
  }

  const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    ...data,
  })).sort((a, b) => b.ticketCount - a.ticketCount);

  // Recent activity
  const recentActivity = recentTickets.map((t: typeof recentTickets[0]) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    title: t.title,
    templateName: t.serviceTemplate?.name || 'Sin plantilla',
    templateIcon: t.serviceTemplate?.icon || null,
    customerName: t.customer.name,
    createdAt: t.createdAt,
    status: t.status,
  }));

  // Monthly trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const allTicketsWithTemplates = await db.ticket.findMany({
    where: {
      serviceTemplateId: { not: null },
      createdAt: {
        gte: sixMonthsAgo,
      },
    },
    include: {
      serviceTemplate: {
        select: {
          laborCost: true,
        },
      },
    },
  });

  const monthlyMap = new Map<string, { ticketCount: number; revenue: number }>();
  for (const ticket of allTicketsWithTemplates) {
    const monthKey = ticket.createdAt.toISOString().slice(0, 7); // YYYY-MM
    const existing = monthlyMap.get(monthKey) || { ticketCount: 0, revenue: 0 };
    const laborCost = ticket.serviceTemplate?.laborCost ? Number(ticket.serviceTemplate.laborCost) : 0;
    monthlyMap.set(monthKey, {
      ticketCount: existing.ticketCount + 1,
      revenue: existing.revenue + laborCost,
    });
  }

  const monthlyTrend = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    summary: {
      totalTemplates: templates.length,
      activeTemplates: activeTemplates.length,
      totalTicketsCreated: totalTicketsFromTemplates,
      totalRevenueFromTemplates: totalRevenue,
    },
    templateUsage,
    categoryBreakdown,
    recentActivity,
    monthlyTrend,
  };
}
