import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./tenant-prisma', () => ({
  getTenantPrisma: vi.fn(),
}));

import {
  calculateEstimatedDate,
  getPartStockStatus,
  calculateTemplateCost,
  formatCurrency,
  CATEGORY_CONFIG,
  getCategoryConfig,
  validateTemplateStock,
} from './template-utils';
import { getTenantPrisma } from './tenant-prisma';

describe('template-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateEstimatedDate', () => {
    it('returns null when durationMinutes is null', () => {
      expect(calculateEstimatedDate(null)).toBeNull();
    });

    it('adds the correct number of hours for a duration in minutes', () => {
      const now = new Date();
      const result = calculateEstimatedDate(120);
      expect(result).not.toBeNull();
      if (result) {
        const diffMs = result.getTime() - now.getTime();
        expect(diffMs).toBeGreaterThanOrEqual(2 * 60 * 60 * 1000 - 1000);
        expect(diffMs).toBeLessThanOrEqual(2 * 60 * 60 * 1000 + 1000);
      }
    });
  });

  describe('getPartStockStatus', () => {
    it('returns insufficient when available is less than required', () => {
      expect(getPartStockStatus(2, 3)).toBe('insufficient');
    });

    it('returns low when available minus required is below minStock', () => {
      expect(getPartStockStatus(12, 5, 10)).toBe('low');
    });

    it('returns sufficient when stock exceeds the threshold', () => {
      expect(getPartStockStatus(30, 10)).toBe('sufficient');
    });
  });

  describe('calculateTemplateCost', () => {
    it('calculates labor, parts, tax and total correctly', () => {
      const result = calculateTemplateCost(100, [
        { price: 20, quantity: 2 },
        { price: 10, quantity: 3 },
      ]);

      expect(result.laborCost).toBe(100);
      expect(result.partsCost).toBe(70);
      expect(result.subtotal).toBe(170);
      expect(result.tax).toBeCloseTo(20.4);
      expect(result.total).toBeCloseTo(190.4);
    });

    it('treats null labor cost as zero', () => {
      const result = calculateTemplateCost(null, [{ price: 50, quantity: 1 }]);
      expect(result.laborCost).toBe(0);
      expect(result.partsCost).toBe(50);
      expect(result.subtotal).toBe(50);
      expect(result.tax).toBe(6);
      expect(result.total).toBe(56);
    });
  });

  describe('formatCurrency', () => {
    it('formats numeric amounts as Guatemalan Quetzales', () => {
      expect(formatCurrency(450)).toBe('Q 450.00');
      expect(formatCurrency(12.3)).toBe('Q 12.30');
    });
  });

  describe('getCategoryConfig', () => {
    it('returns the configured category for a valid key', () => {
      expect(getCategoryConfig('REPAIR')).toEqual(CATEGORY_CONFIG.REPAIR);
    });

    it('falls back to MAINTENANCE for an unknown category', () => {
      expect(getCategoryConfig('UNKNOWN' as any)).toEqual(CATEGORY_CONFIG.MAINTENANCE);
    });
  });

  describe('validateTemplateStock', () => {
    it('returns invalid when template is not found', async () => {
      (getTenantPrisma as any).mockReturnValue({
        serviceTemplate: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      });

      const result = await validateTemplateStock('template-1', 'tenant-1');
      expect(result).toEqual({ valid: false, missingParts: [] });
      expect(getTenantPrisma).toHaveBeenCalledWith('tenant-1', 'system');
    });

    it('returns valid when all required parts have sufficient stock', async () => {
      (getTenantPrisma as any).mockReturnValue({
        serviceTemplate: {
          findUnique: vi.fn().mockResolvedValue({
            defaultParts: [
              {
                partId: 'p1',
                quantity: 2,
                part: { id: 'p1', name: 'Part 1', quantity: 10 },
              },
            ],
          }),
        },
      });

      const result = await validateTemplateStock('template-1', 'tenant-1');
      expect(result).toEqual({ valid: true, missingParts: [] });
    });

    it('returns missing parts when stock is insufficient', async () => {
      (getTenantPrisma as any).mockReturnValue({
        serviceTemplate: {
          findUnique: vi.fn().mockResolvedValue({
            defaultParts: [
              {
                partId: 'p2',
                quantity: 5,
                part: { id: 'p2', name: 'Part 2', quantity: 3 },
              },
            ],
          }),
        },
      });

      const result = await validateTemplateStock('template-1', 'tenant-1');
      expect(result).toEqual({
        valid: false,
        missingParts: [
          {
            partId: 'p2',
            partName: 'Part 2',
            required: 5,
            available: 3,
          },
        ],
      });
    });
  });
});
