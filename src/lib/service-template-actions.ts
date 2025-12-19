'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
import { ServiceCategory, TicketPriority } from '@prisma/client';

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

export async function createServiceTemplate(data: ServiceTemplateFormData) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  // Solo ADMIN puede crear plantillas
  if (session.user.role !== 'ADMIN') {
    throw new Error('Permiso denegado. Solo administradores pueden crear plantillas.');
  }

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

export async function updateServiceTemplate(id: string, data: ServiceTemplateFormData) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  // Solo ADMIN puede editar completamente
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

export async function createTicketFromTemplate(
  templateId: string,
  deviceType: string,
  deviceModel: string,
  customerId: string
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

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
        assignedToId:
          session.user.role === 'TECHNICIAN' ? session.user.id : undefined,
        createdById: session.user.id,
        updatedById: session.user.id,
      },
    });

    // 2. Procesar partes REQUERIDAS con consumo atómico de stock
    const requiredParts = template.defaultParts.filter((dp: any) => dp.required);

    for (const defaultPart of requiredParts) {
      // ATOMIC UPDATE: Solo decrementa si hay stock suficiente
      const updateResult = await tx.part.updateMany({
        where: {
          id: defaultPart.partId,
          quantity: { gte: defaultPart.quantity }, // Condición atómica
        },
        data: {
          quantity: { decrement: defaultPart.quantity }, // Decremento atómico
        },
      });

      // Si no se actualizó ninguna fila, no hay stock suficiente
      if (updateResult.count === 0) {
        throw new Error(
          `Stock insuficiente para ${defaultPart.part.name}. ` +
            `Disponible: ${defaultPart.part.quantity}, Requerido: ${defaultPart.quantity}`
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
    }

    // 3. Agregar partes OPCIONALES (no requieren stock, solo sugerencia)
    const optionalParts = template.defaultParts.filter((dp: any) => !dp.required);

    if (optionalParts.length > 0) {
      // Las partes opcionales se agregan como referencia pero NO consumen stock
      // El técnico decide después si las usa
      for (const optionalPart of optionalParts) {
        // Verificar si hay stock disponible para la sugerencia
        const part = await tx.part.findUnique({
          where: { id: optionalPart.partId },
        });

        if (part && part.quantity >= optionalPart.quantity) {
          // Solo registrar como "sugerencia" en notas
          await tx.ticketNote.create({
            data: {
              ticketId: newTicket.id,
              authorId: session.user.id,
              content: `💡 Parte sugerida por plantilla: ${part.name} (Cantidad: ${optionalPart.quantity})`,
              isInternal: true,
            },
          });
        }
      }
    }

    return newTicket;
  });

  revalidatePath('/dashboard/tickets');
  revalidatePath(`/dashboard/tickets/${ticket.id}`);
  return ticket;
}
