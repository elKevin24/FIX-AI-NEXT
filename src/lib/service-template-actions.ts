'use server';

import { revalidatePath } from 'next/cache';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { requireTenantSession } from '@/lib/auth-context';
import {
  CreateServiceTemplateSchema,
  UpdateServiceTemplateSchema,
  CreateTicketFromTemplateSchema,
  AddPartToTemplateSchema,
  UpdateTemplateDefaultPartSchema,
} from './schemas';
import { TemplateStockValidation } from './template-utils';
import {
  GetServiceTemplatesUseCase,
  GetActiveServiceTemplatesUseCase,
  GetServiceTemplateByIdUseCase,
  CreateServiceTemplateUseCase,
  UpdateServiceTemplateUseCase,
  ToggleServiceTemplateStatusUseCase,
  DeleteServiceTemplateUseCase,
  DuplicateServiceTemplateUseCase,
  GetAvailablePartsUseCase,
  AddPartToTemplateUseCase,
  UpdateTemplateDefaultPartUseCase,
  RemovePartFromTemplateUseCase,
  CreateTicketFromTemplateUseCase,
  GetTemplateAnalyticsUseCase,
  type TemplateAnalytics,
  type ServiceTemplateFormData,
} from '@/use-cases/service-templates';

export type { ServiceTemplateFormData, TemplateAnalytics };

/**
 * Asserts valid tenant session with ADMIN role for service template actions.
 * Throws "No autorizado" if no session and "Permiso denegado" if not admin.
 */
async function requireTemplateAdminSession() {
  const session = await requireTenantSession();
  if (session.userRole !== 'ADMIN') {
    throw new Error('Permiso denegado');
  }
  return session;
}

/**
 * Validate if there's sufficient stock for all required parts in a template
 */
export async function validateTemplateStock(
  templateId: string,
  tenantId: string
): Promise<TemplateStockValidation> {
  const db = getTenantPrisma(tenantId, 'system');

  const template = await db.serviceTemplate.findUnique({
    where: { id: templateId },
    include: {
      defaultParts: {
        where: { required: true },
        include: {
          part: {
            select: {
              id: true,
              name: true,
              quantity: true,
            },
          },
        },
      },
    },
  });

  if (!template) {
    return {
      valid: false,
      missingParts: [],
    };
  }

  const missingParts: TemplateStockValidation['missingParts'] = [];

  for (const defaultPart of template.defaultParts) {
    if (defaultPart.part.quantity < defaultPart.quantity) {
      missingParts.push({
        partId: defaultPart.partId,
        partName: defaultPart.part.name,
        required: defaultPart.quantity,
        available: defaultPart.part.quantity,
      });
    }
  }

  return {
    valid: missingParts.length === 0,
    missingParts,
  };
}

// ============================================================================
// TEMPLATE QUERIES
// ============================================================================

export async function getServiceTemplates() {
  const { db } = await requireTenantSession();
  return GetServiceTemplatesUseCase.execute(db);
}

export async function getActiveServiceTemplates() {
  const { db } = await requireTenantSession();
  return GetActiveServiceTemplatesUseCase.execute(db);
}

export async function getServiceTemplate(id: string) {
  const { tenantId, db } = await requireTenantSession();
  return GetServiceTemplateByIdUseCase.execute(id, tenantId, db);
}

// ============================================================================
// TEMPLATE CRUD (ADMIN ONLY)
// ============================================================================

export async function createServiceTemplate(formData: FormData) {
  const { tenantId, userId, db } = await requireTemplateAdminSession();

  const formDataObj = Object.fromEntries(formData);
  const dataToValidate = {
    ...formDataObj,
    estimatedDuration: formDataObj['estimatedDuration'] ? Number(formDataObj['estimatedDuration']) : undefined,
    laborCost: formDataObj['laborCost'] ? Number(formDataObj['laborCost']) : undefined,
    isActive: formDataObj['isActive'] === 'true',
  };

  const validatedFields = CreateServiceTemplateSchema.safeParse(dataToValidate);
  if (!validatedFields.success) {
    throw new Error(`Error de validación: ${validatedFields.error.errors[0]?.message ?? 'Datos inválidos'}`);
  }

  const template = await CreateServiceTemplateUseCase.execute(validatedFields.data, tenantId, userId, db);
  revalidatePath('/dashboard/settings/service-templates');
  return template;
}

export async function updateServiceTemplate(id: string, formData: FormData) {
  const { tenantId, userId, db } = await requireTemplateAdminSession();

  const formDataObj = Object.fromEntries(formData);
  const dataToValidate = {
    ...formDataObj,
    estimatedDuration: formDataObj['estimatedDuration'] ? Number(formDataObj['estimatedDuration']) : undefined,
    laborCost: formDataObj['laborCost'] ? Number(formDataObj['laborCost']) : undefined,
    isActive: formDataObj['isActive'] === 'true',
  };

  const validatedFields = UpdateServiceTemplateSchema.safeParse(dataToValidate);
  if (!validatedFields.success) {
    throw new Error(`Error de validación: ${validatedFields.error.errors[0]?.message ?? 'Datos inválidos'}`);
  }

  const template = await UpdateServiceTemplateUseCase.execute(id, validatedFields.data, tenantId, userId, db);
  revalidatePath('/dashboard/settings/service-templates');
  revalidatePath(`/dashboard/settings/service-templates/${id}`);
  return template;
}

export async function toggleTemplateActiveStatus(id: string, isActive: boolean) {
  const { tenantId, userId, db } = await requireTemplateAdminSession();
  const template = await ToggleServiceTemplateStatusUseCase.execute(id, isActive, tenantId, userId, db);
  revalidatePath('/dashboard/settings/service-templates');
  return template;
}

export async function deleteServiceTemplate(id: string) {
  const { tenantId, db } = await requireTemplateAdminSession();
  const result = await DeleteServiceTemplateUseCase.execute(id, tenantId, db);
  revalidatePath('/dashboard/settings/service-templates');
  return result;
}

export async function duplicateServiceTemplate(id: string) {
  const { tenantId, userId, db } = await requireTemplateAdminSession();
  const duplicate = await DuplicateServiceTemplateUseCase.execute(id, tenantId, userId, db);
  revalidatePath('/dashboard/settings/service-templates');
  return duplicate;
}

// ============================================================================
// CREATE TICKET FROM TEMPLATE
// ============================================================================

export async function createTicketFromTemplate(formData: FormData) {
  const { tenantId, userId, userRole, db } = await requireTenantSession();

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

  const ticket = await CreateTicketFromTemplateUseCase.execute(
    {
      templateId,
      deviceType,
      deviceModel,
      customerId,
      optionalParts: selectedOptionalPartIds,
      tenantId,
      userId,
      userRole,
    },
    db
  );

  revalidatePath('/dashboard/tickets');
  revalidatePath(`/dashboard/tickets/${ticket.id}`);
  return ticket;
}

// ============================================================================
// TEMPLATE DEFAULT PARTS
// ============================================================================

export async function getAvailableParts() {
  const { db } = await requireTenantSession();
  return GetAvailablePartsUseCase.execute(db);
}

export async function addPartToTemplate(formData: FormData) {
  const { tenantId, db } = await requireTemplateAdminSession();

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

  const defaultPart = await AddPartToTemplateUseCase.execute(validatedFields.data, tenantId, db);
  revalidatePath('/dashboard/settings/service-templates');
  revalidatePath(`/dashboard/settings/service-templates/${validatedFields.data.templateId}/edit`);
  return defaultPart;
}

export async function updateTemplateDefaultPart(formData: FormData) {
  const { tenantId, db } = await requireTemplateAdminSession();

  const formDataObj = Object.fromEntries(formData);
  const dataToValidate = {
    ...formDataObj,
    id: formDataObj['id'],
    quantity: Number(formDataObj['quantity']),
    required: formDataObj['required'] === 'true',
  };

  const validatedFields = UpdateTemplateDefaultPartSchema.safeParse(dataToValidate);
  if (!validatedFields.success) {
    throw new Error(`Error de validación: ${validatedFields.error.errors[0]?.message ?? 'Datos inválidos'}`);
  }

  const updated = await UpdateTemplateDefaultPartUseCase.execute(validatedFields.data, tenantId, db);
  revalidatePath('/dashboard/settings/service-templates');
  revalidatePath(`/dashboard/settings/service-templates/${updated.templateId}/edit`);
  return updated;
}

export async function removePartFromTemplate(id: string) {
  const { tenantId, db } = await requireTemplateAdminSession();
  const result = await RemovePartFromTemplateUseCase.execute(id, tenantId, db);
  revalidatePath('/dashboard/settings/service-templates');
  revalidatePath(`/dashboard/settings/service-templates/${result.templateId}/edit`);
  return { success: true };
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function getTemplateAnalytics(startDate?: Date, endDate?: Date): Promise<TemplateAnalytics> {
  const { db } = await requireTemplateAdminSession();
  return GetTemplateAnalyticsUseCase.execute(startDate, endDate, db);
}
