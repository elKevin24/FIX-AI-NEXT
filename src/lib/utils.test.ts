import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, serializeDecimal } from './utils';

describe('utils formatting helpers', () => {
  describe('formatCurrency', () => {
    it('formats numbers with default currency symbol Q', () => {
      expect(formatCurrency(150.5)).toBe('Q150.50');
      expect(formatCurrency(0)).toBe('Q0.00');
    });

    it('formats numbers with custom currency symbol', () => {
      expect(formatCurrency(99.99, '$')).toBe('$99.99');
    });

    it('handles null and undefined safely', () => {
      expect(formatCurrency(null)).toBe('Q0.00');
      expect(formatCurrency(undefined)).toBe('Q0.00');
    });
  });

  describe('formatDate', () => {
    it('returns N/A for empty or null dates', () => {
      expect(formatDate(null)).toBe('N/A');
      expect(formatDate(undefined)).toBe('N/A');
    });

    it('formats a date object correctly', () => {
      const date = new Date('2026-09-16T12:00:00Z');
      const formatted = formatDate(date, 'en-US');
      expect(formatted).toContain('Sep');
      expect(formatted).toContain('2026');
    });
  });

  describe('serializeDecimal', () => {
    it('serializes primitives without mutation', () => {
      expect(serializeDecimal('test')).toBe('test');
      expect(serializeDecimal(42)).toBe(42);
      expect(serializeDecimal(null)).toBeNull();
    });

    it('serializes objects containing simulated Decimal shapes', () => {
      const mockDecimal = {
        d: [12345],
        e: 2,
        s: 1,
        toNumber: () => 123.45,
      };
      const result = serializeDecimal({ amount: mockDecimal });
      expect(result.amount).toBe(123.45);
    });
  });
});
