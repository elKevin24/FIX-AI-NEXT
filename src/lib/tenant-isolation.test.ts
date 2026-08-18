import { describe, it, expect, vi } from 'vitest';
import { getTenantPrisma } from './tenant-prisma';

const mockPrisma = vi.hoisted(() => ({
  $extends: vi.fn((ext: any) => {
    return {
      __isExtended: true,
      query: ext.query,
    };
  }),
  Ticket: {
    findFirst: vi.fn(),
  },
  Customer: {
    findFirst: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

// The extension's query hooks are internal runtime state, not part of the
// public PrismaClient surface, so tests access them through a narrow cast.
type ExtendedQueryDb = {
  query: {
    $allModels: {
      findMany: (args: unknown) => Promise<unknown>;
      findFirst: (args: unknown) => Promise<unknown>;
    };
  };
};

function getTestDb(tenantId: string, userId: string): ExtendedQueryDb {
  return getTenantPrisma(tenantId, userId) as unknown as ExtendedQueryDb;
}

describe('Tenant Isolation', () => {
  it('debería lanzar un error si no se provee tenantId', () => {
      expect(() => getTenantPrisma('', 'user-1')).toThrow('tenantId es requerido para aislar la base de datos');
  });

  it('debería lanzar un error si no se provee userId', () => {
      expect(() => getTenantPrisma('tenant-1', '')).toThrow('userId es requerido para la auditoría');
  });

  it('getTenantPrisma returns an extended client', () => {
    const db = getTestDb('tenant-1', 'user-1');
    expect(db).toBeDefined();
    expect(db.query).toBeDefined();
    expect((db as any).__isExtended).toBe(true);
  });

  it('injects tenantId into findMany where clause', async () => {
    const db = getTestDb('tenant-abc', 'user-1');
    const queryFn = db.query.$allModels.findMany;

    const fakeQuery = vi.fn().mockResolvedValue([]);
    await queryFn({ model: 'Ticket', args: { where: {} }, query: fakeQuery });

    expect(fakeQuery).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-abc' },
    });
  });

  it('injects tenantId into findFirst where clause', async () => {
    const db = getTestDb('tenant-xyz', 'user-1');
    const queryFn = db.query.$allModels.findFirst;

    const fakeQuery = vi.fn().mockResolvedValue(null);
    await queryFn({ model: 'Customer', args: { where: { id: '123' } }, query: fakeQuery });

    expect(fakeQuery).toHaveBeenCalledWith({
      where: { id: '123', tenantId: 'tenant-xyz' },
    });
  });

  it('does NOT inject tenantId for non-tenant models', async () => {
    const db = getTestDb('tenant-1', 'user-1');
    const queryFn = db.query.$allModels.findMany;

    const fakeQuery = vi.fn().mockResolvedValue([]);
    await queryFn({ model: 'SomeOtherModel', args: { where: {} }, query: fakeQuery });

    expect(fakeQuery).toHaveBeenCalledWith({ where: {} });
  });

  it('preserves existing where fields when injecting tenantId', async () => {
    const db = getTestDb('t-1', 'user-1');
    const queryFn = db.query.$allModels.findMany;

    const fakeQuery = vi.fn().mockResolvedValue([]);
    await queryFn({ model: 'Ticket', args: { where: { status: 'OPEN' } }, query: fakeQuery });

    expect(fakeQuery).toHaveBeenCalledWith({
      where: { status: 'OPEN', tenantId: 't-1' },
    });
  });

  it('overrides tenantId in update queries to the current tenant', async () => {
    const db = getTestDb('tenant-current', 'user-1');
    const queryFn = (db.query.$allModels as any).update;

    mockPrisma.Ticket.findFirst.mockResolvedValue({ id: 'ticket-1' });
    const fakeQuery = vi.fn().mockResolvedValue({ id: 'ticket-1' });

    await queryFn({
      model: 'Ticket',
      args: { where: { id: 'ticket-1', tenantId: 'tenant-evil' }, data: { status: 'CLOSED' } },
      query: fakeQuery,
    });

    expect(fakeQuery).toHaveBeenCalledWith({
      where: { id: 'ticket-1', tenantId: 'tenant-current' },
      data: { status: 'CLOSED', updatedById: 'user-1' },
    });
  });

  it('overrides tenantId in delete queries to the current tenant', async () => {
    const db = getTestDb('tenant-current', 'user-1');
    const queryFn = (db.query.$allModels as any).delete;

    mockPrisma.Ticket.findFirst.mockResolvedValue({ id: 'ticket-1' });
    const fakeQuery = vi.fn().mockResolvedValue({ id: 'ticket-1' });

    await queryFn({
      model: 'Ticket',
      args: { where: { id: 'ticket-1', tenantId: 'tenant-evil' } },
      query: fakeQuery,
    });

    expect(fakeQuery).toHaveBeenCalledWith({
      where: { id: 'ticket-1', tenantId: 'tenant-current' },
    });
  });
});
