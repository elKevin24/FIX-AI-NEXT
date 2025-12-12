'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ServiceCategory } from '@prisma/client';

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
// GET ALL TEMPLATES
// ============================================================================

export async function getServiceTemplates() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('No autorizado');
  }

  const templates = await prisma.serviceTemplate.findMany({
    where: {
      tenantId: session.user.tenantId,
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
  if (!session?.user) {
    throw new Error('No autorizado');
  }

  const templates = await prisma.serviceTemplate.findMany({
    where: {
      tenantId: session.user.tenantId,
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
  if (!session?.user) {
    throw new Error('No autorizado');
  }

  const template = await prisma.serviceTemplate.findUnique({
    where: {
      id,
      tenantId: session.user.tenantId,
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

  return template;
}

// ============================================================================
// CREATE TEMPLATE
// ============================================================================

export async function createServiceTemplate(data: ServiceTemplateFormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('No autorizado');
  }

  // Solo ADMIN puede crear plantillas
  if (session.user.role !== 'ADMIN') {
    throw new Error('Permiso denegado. Solo administradores pueden crear plantillas.');
  }

  const template = await prisma.serviceTemplate.create({
    data: {
      ...data,
      laborCost: data.laborCost ? Number(data.laborCost) : null,
      tenantId: session.user.tenantId,
      createdById: session.user.id,
      updatedById: session.user.id,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'CREATE_SERVICE_TEMPLATE',
      details: JSON.stringify({ templateId: template.id, name: template.name }),
      userId: session.user.id,
      tenantId: session.user.tenantId,
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
  if (!session?.user) {
    throw new Error('No autorizado');
  }

  // Verificar que la plantilla pertenece al tenant
  const existingTemplate = await prisma.serviceTemplate.findUnique({
    where: { id },
  });

  if (!existingTemplate || existingTemplate.tenantId !== session.user.tenantId) {
    throw new Error('Plantilla no encontrada');
  }

  // Solo ADMIN puede editar completamente
  if (session.user.role !== 'ADMIN') {
    throw new Error('Permiso denegado');
  }

  const template = await prisma.serviceTemplate.update({
    where: { id },
    data: {
      ...data,
      laborCost: data.laborCost ? Number(data.laborCost) : null,
      updatedById: session.user.id,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'UPDATE_SERVICE_TEMPLATE',
      details: JSON.stringify({ templateId: template.id, changes: data }),
      userId: session.user.id,
      tenantId: session.user.tenantId,
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
  if (!session?.user) {
    throw new Error('No autorizado');
  }

  // Verificar que la plantilla pertenece al tenant
  const existingTemplate = await prisma.serviceTemplate.findUnique({
    where: { id },
  });

  if (!existingTemplate || existingTemplate.tenantId !== session.user.tenantId) {
    throw new Error('Plantilla no encontrada');
  }

  // Solo ADMIN puede activar/desactivar
  if (session.user.role !== 'ADMIN') {
    throw new Error('Permiso denegado');
  }

  const template = await prisma.serviceTemplate.update({
    where: { id },
    data: {
      isActive,
      updatedById: session.user.id,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: isActive ? 'ACTIVATE_SERVICE_TEMPLATE' : 'DEACTIVATE_SERVICE_TEMPLATE',
      details: JSON.stringify({ templateId: template.id, name: template.name }),
      userId: session.user.id,
      tenantId: session.user.tenantId,
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
  if (!session?.user) {
    throw new Error('No autorizado');
  }

  // Solo ADMIN puede eliminar
  if (session.user.role !== 'ADMIN') {
    throw new Error('Permiso denegado');
  }

  // Verificar que la plantilla pertenece al tenant
  const existingTemplate = await prisma.serviceTemplate.findUnique({
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

  await prisma.serviceTemplate.delete({
    where: { id },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'DELETE_SERVICE_TEMPLATE',
      details: JSON.stringify({ templateId: id, name: existingTemplate.name }),
      userId: session.user.id,
      tenantId: session.user.tenantId,
    },
  });

  revalidatePath('/dashboard/settings/service-templates');
  return { success: true };
}

// ============================================================================
// DUPLICATE TEMPLATE
// ============================================================================

export async function duplicateServiceTemplate(id: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('No autorizado');
  }

  // Solo ADMIN puede duplicar
  if (session.user.role !== 'ADMIN') {
    throw new Error('Permiso denegado');
  }

  // Obtener plantilla original
  const original = await prisma.serviceTemplate.findUnique({
    where: { id },
    include: {
      defaultParts: true,
    },
  });

  if (!original || original.tenantId !== session.user.tenantId) {
    throw new Error('Plantilla no encontrada');
  }

  // Crear copia
  const duplicate = await prisma.serviceTemplate.create({
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
        create: original.defaultParts.map((dp) => ({
          partId: dp.partId,
          quantity: dp.quantity,
          required: dp.required,
        })),
      },
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'DUPLICATE_SERVICE_TEMPLATE',
      details: JSON.stringify({
        originalId: id,
        duplicateId: duplicate.id,
        name: duplicate.name,
      }),
      userId: session.user.id,
      tenantId: session.user.tenantId,
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
  customerId: string,
  deviceType?: string,
  deviceModel?: string
) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('No autorizado');
  }

  // Obtener plantilla
  const template = await prisma.serviceTemplate.findUnique({
    where: { id: templateId },
    include: {
      defaultParts: true,
    },
  });

  if (!template || template.tenantId !== session.user.tenantId) {
    throw new Error('Plantilla no encontrada');
  }

  if (!template.isActive) {
    throw new Error('Esta plantilla está inactiva');
  }

  // Crear ticket usando la plantilla
  const ticket = await prisma.ticket.create({
    data: {
      title: template.defaultTitle,
      description: template.defaultDescription,
      priority: template.defaultPriority,
      deviceType: deviceType || 'PC',
      deviceModel: deviceModel || '',
      customerId,
      tenantId: session.user.tenantId,
      serviceTemplateId: templateId,
      // Asignar automáticamente si el usuario es técnico
      assignedToId: session.user.role === 'TECHNICIAN' ? session.user.id : undefined,
      createdById: session.user.id,
      updatedById: session.user.id,
    },
  });

  // Agregar repuestos default si los hay
  if (template.defaultParts.length > 0) {
    await prisma.partUsage.createMany({
      data: template.defaultParts.map((dp) => ({
        ticketId: ticket.id,
        partId: dp.partId,
        quantity: dp.quantity,
      })),
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'CREATE_TICKET_FROM_TEMPLATE',
      details: JSON.stringify({
        ticketId: ticket.id,
        templateId,
        templateName: template.name,
      }),
      userId: session.user.id,
      tenantId: session.user.tenantId,
    },
  });

  revalidatePath('/dashboard/tickets');
  return ticket;
}
