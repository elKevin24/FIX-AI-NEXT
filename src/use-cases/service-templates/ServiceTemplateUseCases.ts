import type { TenantPrismaClient } from './types';
import { serializeTemplate } from './template-serialization';

export class GetServiceTemplatesUseCase {
  static async execute(db: TenantPrismaClient) {
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

    return templates.map(serializeTemplate);
  }
}

export class GetActiveServiceTemplatesUseCase {
  static async execute(db: TenantPrismaClient) {
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

    return templates.map(serializeTemplate);
  }
}

export class GetServiceTemplateByIdUseCase {
  static async execute(id: string, tenantId: string, db: TenantPrismaClient) {
    const template = await db.serviceTemplate.findUnique({
      where: { id },
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

    if (template.tenantId !== tenantId) {
      throw new Error('Acceso denegado');
    }

    return serializeTemplate(template);
  }
}

export class CreateServiceTemplateUseCase {
  static async execute(
    data: any,
    tenantId: string,
    userId: string,
    db: TenantPrismaClient
  ) {
    return await db.serviceTemplate.create({
      data: {
        ...data,
        laborCost: data.laborCost ? Number(data.laborCost) : null,
        tenantId,
        createdById: userId,
        updatedById: userId,
      },
    });
  }
}

export class UpdateServiceTemplateUseCase {
  static async execute(
    id: string,
    data: any,
    tenantId: string,
    userId: string,
    db: TenantPrismaClient
  ) {
    const existingTemplate = await db.serviceTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate || existingTemplate.tenantId !== tenantId) {
      throw new Error('Plantilla no encontrada');
    }

    return await db.serviceTemplate.update({
      where: { id },
      data: {
        ...data,
        laborCost: data.laborCost ? Number(data.laborCost) : null,
        updatedById: userId,
      },
    });
  }
}

export class ToggleServiceTemplateStatusUseCase {
  static async execute(
    id: string,
    isActive: boolean,
    tenantId: string,
    userId: string,
    db: TenantPrismaClient
  ) {
    const existingTemplate = await db.serviceTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate || existingTemplate.tenantId !== tenantId) {
      throw new Error('Plantilla no encontrada');
    }

    return await db.serviceTemplate.update({
      where: { id },
      data: {
        isActive,
        updatedById: userId,
      },
    });
  }
}

export class DeleteServiceTemplateUseCase {
  static async execute(
    id: string,
    tenantId: string,
    db: TenantPrismaClient
  ) {
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

    if (!existingTemplate || existingTemplate.tenantId !== tenantId) {
      throw new Error('Plantilla no encontrada');
    }

    if (existingTemplate._count.tickets > 0) {
      throw new Error(
        `No se puede eliminar. Esta plantilla tiene ${existingTemplate._count.tickets} tickets asociados.`
      );
    }

    await db.serviceTemplate.delete({
      where: { id },
    });

    return { success: true };
  }
}

export class DuplicateServiceTemplateUseCase {
  static async execute(
    id: string,
    tenantId: string,
    userId: string,
    db: TenantPrismaClient
  ) {
    const original = await db.serviceTemplate.findUnique({
      where: { id },
      include: {
        defaultParts: true,
      },
    });

    if (!original || original.tenantId !== tenantId) {
      throw new Error('Plantilla no encontrada');
    }

    return await db.serviceTemplate.create({
      data: {
        name: `${original.name} (Copia)`,
        category: original.category,
        defaultTitle: original.defaultTitle,
        defaultDescription: original.defaultDescription,
        defaultPriority: original.defaultPriority,
        estimatedDuration: original.estimatedDuration,
        laborCost: original.laborCost,
        isActive: false,
        color: original.color,
        icon: original.icon,
        tenantId,
        createdById: userId,
        updatedById: userId,
        defaultParts: {
          create: original.defaultParts.map((dp: { partId: string; quantity: number; required: boolean }) => ({
            partId: dp.partId,
            quantity: dp.quantity,
            required: dp.required,
          })),
        },
      },
    });
  }
}
