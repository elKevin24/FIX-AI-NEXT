import { describe, expect, it } from 'vitest';
import { reserveInventoryForTenant } from './inventory-atomic';

describe('inventory concurrency safety', () => {
  it('never allows a last unit to be consumed twice under concurrent requests', async () => {
    const state = {
      tenantId: 'tenant-1',
      itemId: 'part-1',
      quantity: 1,
    };

    const mockDb = {
      part: {
        updateMany: async ({ where, data }: { where: any; data: any }) => {
          if (state.quantity < where.quantity.gte) {
            return { count: 0 };
          }

          state.quantity = Math.max(0, state.quantity - data.quantity.decrement);
          return { count: 1 };
        },
      },
    };

    const outcomes = await Promise.all(
      Array.from({ length: 10 }, async () => {
        try {
          return await reserveInventoryForTenant(mockDb as any, 'tenant-1', 'part-1', 1);
        } catch (error) {
          return { error: (error as Error).message };
        }
      }),
    );

    expect(state.quantity).toBe(0);
    expect(outcomes.filter((value) => !('error' in (value as any))).length).toBe(1);
  });
});
