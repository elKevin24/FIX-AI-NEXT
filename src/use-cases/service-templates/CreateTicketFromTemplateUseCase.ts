import { Prisma } from '@prisma/client';
import type { TenantPrismaClient, TemplateWithParts } from './types';
import { convertPriorityToEnum } from './template-serialization';
import { notifyLowStock, notifyTicketCreated } from '@/lib/ticket-notifications';

export interface CreateTicketFromTemplateDTO {
  templateId: string;
  deviceType?: string | null;
  deviceModel?: string | null;
  customerId: string;
  optionalParts?: string[];
  tenantId: string;
  userId: string;
  userRole: string;
}

export class CreateTicketFromTemplateUseCase {
  static async execute(
    dto: CreateTicketFromTemplateDTO,
    db: TenantPrismaClient
  ) {
    const {
      templateId,
      deviceType,
      deviceModel,
      customerId,
      optionalParts: selectedOptionalPartIds,
      tenantId,
      userId,
      userRole,
    } = dto;

    const template = await this.fetchValidatedTemplate(db, templateId, tenantId);
    await this.assertCustomerBelongsToTenant(db, customerId, tenantId);

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
            tenantId,
            serviceTemplateId: templateId,
            dueDate: template.estimatedDuration
              ? new Date(Date.now() + template.estimatedDuration * 60_000)
              : undefined,
            estimatedCompletionDate: template.estimatedDuration
              ? new Date(Date.now() + template.estimatedDuration * 60_000)
              : undefined,
            assignedToId: userRole === 'TECHNICIAN' ? userId : undefined,
            createdById: userId,
            updatedById: userId,
          },
        });

        const requiredParts = template.defaultParts.filter(
          (part: TemplateWithParts['defaultParts'][number]) => part.required,
        );
        await this.consumePartsAtomically(tx, newTicket.id, requiredParts);

        const optionalTemplateParts = template.defaultParts.filter(
          (part: TemplateWithParts['defaultParts'][number]) => !part.required,
        );
        const selectedParts = optionalTemplateParts.filter(
          (part: TemplateWithParts['defaultParts'][number]) => selectedOptionalPartIds?.includes(part.partId),
        );
        await this.consumePartsAtomically(tx, newTicket.id, selectedParts);

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
        console.error('Failed to send ticket creation notification:', notificationError);
      }
    }

    return ticket;
  }

  private static async fetchValidatedTemplate(
    db: TenantPrismaClient,
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

  private static async assertCustomerBelongsToTenant(
    db: TenantPrismaClient,
    customerId: string,
    tenantId: string,
  ): Promise<void> {
    const customer = await db.customer.findUnique({ where: { id: customerId } });
    if (!customer || customer.tenantId !== tenantId) {
      throw new Error('Cliente no encontrado o no pertenece a tu organización');
    }
  }

  private static async consumePartsAtomically(
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
}
