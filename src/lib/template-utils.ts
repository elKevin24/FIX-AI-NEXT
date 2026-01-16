import { addHours } from 'date-fns';
import { getTenantPrisma } from './tenant-prisma';

// ============================================================================
// TYPES
// ============================================================================

export type TemplateStockValidation = {
  valid: boolean;
  missingParts: Array<{
    partId: string;
    partName: string;
    required: number;
    available: number;
  }>;
};

export type TemplateCostBreakdown = {
  laborCost: number;
  partsCost: number;
  subtotal: number;
  tax: number; // IVA 12% (Guatemala)
  total: number;
};

// ============================================================================
// DATE CALCULATIONS
// ============================================================================

/**
 * Calculate estimated completion date based on duration in minutes
 * @param durationMinutes - Duration in minutes
 * @returns Estimated completion date
 */
export function calculateEstimatedDate(durationMinutes: number | null): Date | null {
  if (!durationMinutes) return null;

  const now = new Date();
  const estimatedHours = durationMinutes / 60;
  return addHours(now, estimatedHours);
}

// ============================================================================
// STOCK VALIDATION
// ============================================================================

/**
 * Validate if there's sufficient stock for all required parts in a template
 * @param templateId - Template ID
 * @param tenantId - Tenant ID
 * @returns Validation result with missing parts details
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
        where: { required: true }, // Only check required parts
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

/**
 * Get stock status indicator for a part
 * @param available - Available quantity
 * @param required - Required quantity
 * @param minStock - Minimum stock threshold (default: 10)
 * @returns Status: 'sufficient' | 'low' | 'insufficient'
 */
export function getPartStockStatus(
  available: number,
  required: number,
  minStock: number = 10
): 'sufficient' | 'low' | 'insufficient' {
  if (available < required) {
    return 'insufficient';
  }

  if (available - required < minStock) {
    return 'low';
  }

  return 'sufficient';
}

// ============================================================================
// COST CALCULATIONS
// ============================================================================

/**
 * Calculate total estimated cost for a template
 * @param laborCost - Labor cost
 * @param parts - Array of parts with prices and quantities
 * @returns Cost breakdown with tax
 */
export function calculateTemplateCost(
  laborCost: number | null,
  parts: Array<{ price: number; quantity: number }>
): TemplateCostBreakdown {
  const labor = laborCost || 0;
  const partsCost = parts.reduce((sum, part) => sum + part.price * part.quantity, 0);
  const subtotal = labor + partsCost;
  const tax = subtotal * 0.12; // IVA 12% (Guatemala)
  const total = subtotal + tax;

  return {
    laborCost: labor,
    partsCost,
    subtotal,
    tax,
    total,
  };
}

/**
 * Format currency in Guatemalan Quetzales
 * @param amount - Amount to format
 * @returns Formatted currency string (e.g., "Q 450.00")
 */
export function formatCurrency(amount: number): string {
  return `Q ${amount.toFixed(2)}`;
}

// ============================================================================
// CATEGORY UTILITIES
// ============================================================================

export const CATEGORY_CONFIG = {
  MAINTENANCE: {
    color: '#10B981', // Green
    icon: '🧹',
    label: 'Mantenimiento',
    description: 'Servicios de mantenimiento preventivo y limpieza',
  },
  REPAIR: {
    color: '#EF4444', // Red
    icon: '⚡',
    label: 'Reparación',
    description: 'Reparación de componentes y fallas',
  },
  UPGRADE: {
    color: '#3B82F6', // Blue
    icon: '⬆️',
    label: 'Upgrade',
    description: 'Actualización de componentes y hardware',
  },
  DIAGNOSTIC: {
    color: '#F59E0B', // Amber
    icon: '🔍',
    label: 'Diagnóstico',
    description: 'Diagnóstico de problemas y fallas',
  },
  INSTALLATION: {
    color: '#8B5CF6', // Purple
    icon: '🪟',
    label: 'Instalación',
    description: 'Instalación de software y sistemas',
  },
  CONSULTATION: {
    color: '#6366F1', // Indigo
    icon: '💡',
    label: 'Consultoría',
    description: 'Asesoría técnica y recomendaciones',
  },
} as const;

/**
 * Get category configuration by category key
 * @param category - Category key
 * @returns Category configuration
 */
export function getCategoryConfig(category: keyof typeof CATEGORY_CONFIG) {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.MAINTENANCE;
}

// ============================================================================
// TEMPLATE VALIDATION
// ============================================================================

/**
 * Validate template data before saving
 * @param data - Template data
 * @returns Validation result
 */
export function validateTemplateData(data: {
  name: string;
  defaultTitle: string;
  estimatedDuration?: number | null;
  laborCost?: number | null;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('El nombre de la plantilla es requerido');
  }

  if (!data.defaultTitle || data.defaultTitle.trim().length === 0) {
    errors.push('El título por defecto es requerido');
  }

  if (data.estimatedDuration !== null && data.estimatedDuration !== undefined) {
    if (data.estimatedDuration < 0) {
      errors.push('La duración estimada debe ser positiva');
    }
  }

  if (data.laborCost !== null && data.laborCost !== undefined) {
    if (data.laborCost < 0) {
      errors.push('El costo de mano de obra debe ser positivo');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
