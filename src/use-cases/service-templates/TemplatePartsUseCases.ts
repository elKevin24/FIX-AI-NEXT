import type { TenantPrismaClient } from './types';

export class GetAvailablePartsUseCase {
  static async execute(db: TenantPrismaClient) {
    return await db.part.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }
}

export class AddPartToTemplateUseCase {
  static async execute(
    data: { templateId: string; partId: string; quantity: number; required: boolean },
    tenantId: string,
    db: TenantPrismaClient
  ) {
    const { templateId, partId, quantity, required } = data;

    // Verificar que la plantilla pertenece al tenant
    const template = await db.serviceTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || template.tenantId !== tenantId) {
      throw new Error('Plantilla no encontrada');
    }

    // Verificar que la parte pertenece al tenant
    const part = await db.part.findUnique({
      where: { id: partId },
    });

    if (!part || part.tenantId !== tenantId) {
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

    return await db.templateDefaultPart.create({
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
  }
}

export class UpdateTemplateDefaultPartUseCase {
  static async execute(
    data: { id: string; quantity: number; required: boolean },
    tenantId: string,
    db: TenantPrismaClient
  ) {
    const { id, quantity, required } = data;

    // Verificar que existe y pertenece al tenant
    const defaultPart = await db.templateDefaultPart.findUnique({
      where: { id },
      include: {
        template: true,
      },
    });

    if (!defaultPart || defaultPart.template.tenantId !== tenantId) {
      throw new Error('Parte de plantilla no encontrada');
    }

    return await db.templateDefaultPart.update({
      where: { id },
      data: {
        quantity,
        required,
      },
      include: {
        part: true,
      },
    });
  }
}

export class RemovePartFromTemplateUseCase {
  static async execute(
    id: string,
    tenantId: string,
    db: TenantPrismaClient
  ) {
    // Verificar que existe y pertenece al tenant
    const defaultPart = await db.templateDefaultPart.findUnique({
      where: { id },
      include: {
        template: true,
      },
    });

    if (!defaultPart || defaultPart.template.tenantId !== tenantId) {
      throw new Error('Parte de plantilla no encontrada');
    }

    await db.templateDefaultPart.delete({
      where: { id },
    });

    return { success: true, templateId: defaultPart.templateId };
  }
}
