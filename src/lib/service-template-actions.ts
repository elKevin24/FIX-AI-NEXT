'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
import { ServiceCategory, TicketPriority, Prisma } from '@prisma/client';
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
    estimatedDuration: formDataObj['estimatedDuration'] ? Number(formDataObj['estimatedDuration']) : undefined,
    laborCost: formDataObj['laborCost'] ? Number(formDataObj['laborCost']) : undefined,
    isActive: formDataObj['isActive'] === 'true', // Convert string 'true' to boolean true
  };

  const validatedFields = CreateServiceTemplateSchema.safeParse(dataToValidate);

  if (!validatedFields.success) {
    throw new Error(`Error de validación: ${validatedFields.error.errors[0]?.message ?? 'Datos inválidos'}`);
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
    estimatedDuration: formDataObj['estimatedDuration'] ? Number(formDataObj['estimatedDuration']) : undefined,
    laborCost: formDataObj['laborCost'] ? Number(formDataObj['laborCost']) : undefined,
    isActive: formDataObj['isActive'] === 'true', // Convert string 'true' to boolean true
  };

  const validatedFields = UpdateServiceTemplateSchema.safeParse(dataToValidate);

  if (!validatedFields.success) {
    throw new Error(`Error de validación: ${validatedFields.error.errors[0]?.message ?? 'Datos inválidos'}`);
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
  const rawOptionalParts = formData.get('optionalParts');
  if (rawOptionalParts && typeof rawOptionalParts === 'string') {
    try {
      optionalParts = JSON.parse(rawOptionalParts);
    } catch {
      throw new Error('El formato de las partes opcionales es inválido.');
    }
  }

  const validatedFields = CreateTicketFromTemplateSchema.safeParse({ ...formDataObj, optionalParts });

  if (!validatedFields.success) {
    throw new Error(`Error de validación: ${validatedFields.error.errors[0]?.message ?? 'Datos inválidos'}`);
  }

  const { templateId, deviceType, deviceModel, customerId, optionalParts: selectedOptionalPartIds } = validatedFields.data;
  const db = getTenantPrisma(session.user.tenantId, session.user.id);

  const template = await fetchValidatedTemplate(db, templateId, session.user.tenantId);
  await assertCustomerBelongsToTenant(db, customerId, session.user.tenantId);

  const ticket = await db.$transaction(
    async (tx: Prisma.TransactionClient) => {
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
          dueDate: template.estimatedDuration
            ? new Date(Date.now() + template.estimatedDuration * 60_000)
            : undefined,
          estimatedCompletionDate: template.estimatedDuration
            ? new Date(Date.now() + template.estimatedDuration * 60_000)
            : undefined,
          assignedToId: session.user.role === 'TECHNICIAN' ? session.user.id : undefined,
          createdById: session.user.id,
          updatedById: session.user.id,
        },
      });

      const requiredParts = template.defaultParts.filter(
        (part: TemplateWithParts['defaultParts'][number]) => part.required,
      );
      await consumePartsAtomically(tx, newTicket.id, requiredParts);

      const optionalTemplateParts = template.defaultParts.filter(
        (part: TemplateWithParts['defaultParts'][number]) => !part.required,
      );
      const selectedParts = optionalTemplateParts.filter(
        (part: TemplateWithParts['defaultParts'][number]) => selectedOptionalPartIds?.includes(part.partId),
      );
      await consumePartsAtomically(tx, newTicket.id, selectedParts);

      return newTicket;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  const ticketWithRelations = await db.ticket.findUnique({
    where: { id: ticket.id },
    include: { customer: true, assignedTo: true },
  });

  if (ticketWithRelations) {
    try {
      await notifyTicketCreated({
        id: ticketWithRelations.id,
        ticketNumber: ticketWithRelations.ticketNumber,
        title: ticketWithRelations.title,
        deviceType: ticketWithRelations.deviceType,
        deviceModel: ticketWithRelations.deviceModel,
        status: ticketWithRelations.status,
        customerId: ticketWithRelations.customerId,
        customer: {
          id: ticketWithRelations.customer.id,
          name: ticketWithRelations.customer.name,
          email: ticketWithRelations.customer.email,
        },
        assignedTo: ticketWithRelations.assignedTo,
        tenantId: ticketWithRelations.tenantId,
      });
    } catch (notificationError) {
      // Notification failures must not fail ticket creation
      console.error('Failed to send ticket creation notification:', notificationError);
    }
  }

  revalidatePath('/dashboard/tickets');
  revalidatePath(`/dashboard/tickets/${ticket.id}`);
  return ticket;
}

// ---------------------------------------------------------------------------
// Private helpers for createTicketFromTemplate
// ---------------------------------------------------------------------------

type TemplateWithParts = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getTenantPrisma>['serviceTemplate']['findUnique']>>
> & {
  defaultParts: Array<{
    partId: string;
    quantity: number;
    required: boolean;
    part: { name: string };
  }>;
};

/** Fetches a service template and asserts it is active and belongs to the tenant. */
async function fetchValidatedTemplate(
  db: ReturnType<typeof getTenantPrisma>,
  templateId: string,
  tenantId: string,
): Promise<TemplateWithParts> {
  const template = await db.serviceTemplate.findUnique({
    where: { id: templateId },
    include: { defaultParts: { include: { part: true } } },
  });

  if (!template || template.tenantId !== tenantId) {
    throw new Error('Plantilla no encontrada');
  }
  if (!template.isActive) {
    throw new Error('Esta plantilla está inactiva');
  }

  return template as TemplateWithParts;
}

/** Asserts that a customer record exists and belongs to the current tenant. */
async function assertCustomerBelongsToTenant(
  db: ReturnType<typeof getTenantPrisma>,
  customerId: string,
  tenantId: string,
): Promise<void> {
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.tenantId !== tenantId) {
    throw new Error('Cliente no encontrado o no pertenece a tu organización');
  }
}

/**
 * Atomically validates and registers part usage for a list of template parts.
 * The DB trigger `trg_update_stock_on_usage` handles the actual stock decrement,
 * but we pre-validate here to surface clear, user-friendly stock errors before
 * the trigger fires.
 */
async function consumePartsAtomically(
  tx: Prisma.TransactionClient,
  ticketId: string,
  parts: Array<{ partId: string; quantity: number; part: { name: string } }>,
): Promise<void> {
  for (const templatePart of parts) {
    const stock = await tx.part.findUnique({ where: { id: templatePart.partId } });

    if (!stock || stock.quantity < templatePart.quantity) {
      throw new Error(
        `Stock insuficiente para ${templatePart.part.name}. ` +
          `Disponible: ${stock?.quantity ?? 0}, Requerido: ${templatePart.quantity}`,
      );
    }

    await tx.partUsage.create({
      data: { ticketId, partId: templatePart.partId, quantity: templatePart.quantity },
    });

    const updatedStock = await tx.part.findUnique({
      where: { id: templatePart.partId },
      select: { name: true, quantity: true, minStock: true, tenantId: true },
    });

    if (updatedStock && updatedStock.quantity <= updatedStock.minStock) {
      await notifyLowStock(updatedStock.name, updatedStock.quantity, updatedStock.tenantId);
    }
  }
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
    quantity: Number(formDataObj['quantity']),
    required: formDataObj['required'] === 'true',
  };

  const validatedFields = AddPartToTemplateSchema.safeParse(dataToValidate);

  if (!validatedFields.success) {
    throw new Error(`Error de validación: ${validatedFields.error.errors[0]?.message ?? 'Datos inválidos'}`);
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
    id: formDataObj['id'], // Assuming 'id' is passed as a hidden field
    quantity: Number(formDataObj['quantity']),
    required: formDataObj['required'] === 'true',
  };

  const validatedFields = UpdateTemplateDefaultPartSchema.safeParse(dataToValidate);

  if (!validatedFields.success) {
    throw new Error(`Error de validación: ${validatedFields.error.errors[0]?.message ?? 'Datos inválidos'}`);
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
