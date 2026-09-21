import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTenantPrisma } from '@/lib/tenant-prisma';

/**
 * Mock de la instancia base de Prisma.
 * `$extends` captura la extensión para poder invocar los handlers directamente,
 * y cada modelo expone `findFirst` (usado por findUnique/update/delete para
 * verificar propiedad del registro dentro del tenant).
 */
const mockPrisma = vi.hoisted(() => {
  const model: any = () => {};
  model.findFirst = vi.fn();
  return {
    $extends: vi.fn((ext: any) => ({
      __isExtended: true,
      query: ext.query,
    })),
    model,
    Ticket: { findFirst: vi.fn() },
    Part: { findFirst: vi.fn() },
    SomeOtherModel: { findFirst: vi.fn() },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

const TENANT = 'tenant-1';
const USER = 'user-1';

type Handler = (params: { model: string; args: any; query: any }) => Promise<any>;

function getHandlers() {
  const db = getTenantPrisma(TENANT, USER);
  const q = (db as any).query.$allModels;
  return {
    findMany: q.findMany as Handler,
    findFirst: q.findFirst as Handler,
    findUnique: q.findUnique as Handler,
    create: q.create as Handler,
    createMany: q.createMany as Handler,
    update: q.update as Handler,
    updateMany: q.updateMany as Handler,
    delete: q.delete as Handler,
    deleteMany: q.deleteMany as Handler,
    count: q.count as Handler,
    aggregate: q.aggregate as Handler,
    groupBy: q.groupBy as Handler,
  };
}

describe('getTenantPrisma', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lanza error si no se provee tenantId', () => {
    expect(() => getTenantPrisma('', USER)).toThrow('tenantId es requerido para aislar la base de datos');
  });

  it('lanza error si userId es una cadena vacía', () => {
    expect(() => getTenantPrisma(TENANT, '')).toThrow('userId es requerido para la auditoría');
  });

  it('permite omitir userId (sin auditoría)', () => {
    expect(() => getTenantPrisma(TENANT)).not.toThrow();
  });

  it('retorna un cliente extendido', () => {
    const db = getTenantPrisma(TENANT, USER);
    expect((db as any).__isExtended).toBe(true);
    expect((db as any).query).toBeDefined();
  });
});

describe('scoping de consultas', () => {
  it('findMany inyecta tenantId preservando where existente', async () => {
    const h = getHandlers();
    const fakeQuery = vi.fn().mockResolvedValue([]);
    await h.findMany({ model: 'Ticket', args: { where: { status: 'OPEN' } }, query: fakeQuery });
    expect(fakeQuery).toHaveBeenCalledWith({ where: { status: 'OPEN', tenantId: TENANT } });
  });

  it('findMany NO scopes modelos sin tenant', async () => {
    const h = getHandlers();
    const fakeQuery = vi.fn().mockResolvedValue([]);
    await h.findMany({ model: 'SomeOtherModel', args: { where: { a: 1 } }, query: fakeQuery });
    expect(fakeQuery).toHaveBeenCalledWith({ where: { a: 1 } });
  });

  it('findFirst inyecta tenantId', async () => {
    const h = getHandlers();
    const fakeQuery = vi.fn().mockResolvedValue(null);
    await h.findFirst({ model: 'Customer', args: { where: { id: '123' } }, query: fakeQuery });
    expect(fakeQuery).toHaveBeenCalledWith({ where: { id: '123', tenantId: TENANT } });
  });

  it('count inyecta tenantId', async () => {
    const h = getHandlers();
    const fakeQuery = vi.fn().mockResolvedValue(3);
    await h.count({ model: 'Ticket', args: { where: {} }, query: fakeQuery });
    expect(fakeQuery).toHaveBeenCalledWith({ where: { tenantId: TENANT } });
  });

  it('aggregate inyecta tenantId', async () => {
    const h = getHandlers();
    const fakeQuery = vi.fn().mockResolvedValue({});
    await h.aggregate({ model: 'Invoice', args: { where: {}, _sum: { total: true } }, query: fakeQuery });
    expect(fakeQuery).toHaveBeenCalledWith({ where: { tenantId: TENANT }, _sum: { total: true } });
  });

  it('groupBy inyecta tenantId', async () => {
    const h = getHandlers();
    const fakeQuery = vi.fn().mockResolvedValue([]);
    await h.groupBy({ model: 'Ticket', args: { where: {}, by: ['status'] }, query: fakeQuery });
    expect(fakeQuery).toHaveBeenCalledWith({ where: { tenantId: TENANT }, by: ['status'] });
  });

  it('deleteMany inyecta tenantId', async () => {
    const h = getHandlers();
    const fakeQuery = vi.fn().mockResolvedValue({ count: 0 });
    await h.deleteMany({ model: 'Part', args: { where: { id: 'p1' } }, query: fakeQuery });
    expect(fakeQuery).toHaveBeenCalledWith({ where: { id: 'p1', tenantId: TENANT } });
  });
});

describe('findUnique', () => {
  it('convierte findUnique a findFirst con tenantId en el cliente base', async () => {
    const h = getHandlers();
    mockPrisma.Ticket.findFirst.mockResolvedValue({ id: 't1' });
    const result = await h.findUnique({
      model: 'Ticket',
      args: { where: { id: 't1' }, include: { customer: true } },
      query: vi.fn(),
    });
    expect(mockPrisma.Ticket.findFirst).toHaveBeenCalledWith({
      where: { id: 't1', tenantId: TENANT },
      include: { customer: true },
    });
    expect(result).toEqual({ id: 't1' });
  });

  it('findUnique para modelos sin tenant usa el query normal', async () => {
    const h = getHandlers();
    const fakeQuery = vi.fn().mockResolvedValue(null);
    await h.findUnique({ model: 'SomeOtherModel', args: { where: { id: 'x' } }, query: fakeQuery });
    expect(fakeQuery).toHaveBeenCalled();
    expect(mockPrisma.SomeOtherModel.findFirst).not.toHaveBeenCalled();
  });
});

describe('create', () => {
  it('inyecta tenantId + createdById + updatedById', async () => {
    const h = getHandlers();
    const fakeQuery = vi.fn().mockResolvedValue({ id: 'new' });
    await h.create({ model: 'Ticket', args: { data: { title: 'T' } }, query: fakeQuery });
    expect(fakeQuery).toHaveBeenCalledWith({
      data: { title: 'T', tenantId: TENANT, createdById: USER, updatedById: USER },
    });
  });

  it('inyecta solo tenantId cuando no hay userId', async () => {
    const db = getTenantPrisma(TENANT);
    const create = (db as any).query.$allModels.create as Handler;
    const fakeQuery = vi.fn().mockResolvedValue({});
    await create({ model: 'Ticket', args: { data: { title: 'T' } }, query: fakeQuery });
    expect(fakeQuery).toHaveBeenCalledWith({ data: { title: 'T', tenantId: TENANT } });
  });

  it('NO agrega audit fields para modelos sin createdById/updatedById', async () => {
    const h = getHandlers();
    const fakeQuery = vi.fn().mockResolvedValue({});
    await h.create({ model: 'Notification', args: { data: { userId: 'u' } }, query: fakeQuery });
    expect(fakeQuery).toHaveBeenCalledWith({ data: { userId: 'u', tenantId: TENANT } });
  });

  it('CashTransaction (solo createdById) no recibe updatedById', async () => {
    const h = getHandlers();
    const fakeQuery = vi.fn().mockResolvedValue({});
    await h.create({ model: 'CashTransaction', args: { data: { amount: 5 } }, query: fakeQuery });
    expect(fakeQuery).toHaveBeenCalledWith({
      data: { amount: 5, tenantId: TENANT, createdById: USER },
    });
  });

  it('create en modelos sin tenant no inyecta nada', async () => {
    const h = getHandlers();
    const fakeQuery = vi.fn().mockResolvedValue({});
    await h.create({ model: 'SomeOtherModel', args: { data: { a: 1 } }, query: fakeQuery });
    expect(fakeQuery).toHaveBeenCalledWith({ data: { a: 1 } });
  });
});

describe('createMany', () => {
  it('enriquece cada item de un arreglo', async () => {
    const h = getHandlers();
    const fakeQuery = vi.fn().mockResolvedValue({ count: 2 });
    await h.createMany({
      model: 'Ticket',
      args: { data: [{ title: 'A' }, { title: 'B' }] },
      query: fakeQuery,
    });
    expect(fakeQuery).toHaveBeenCalledWith({
      data: [
        { title: 'A', tenantId: TENANT, createdById: USER, updatedById: USER },
        { title: 'B', tenantId: TENANT, createdById: USER, updatedById: USER },
      ],
    });
  });

  it('enriquece un objeto simple', async () => {
    const h = getHandlers();
    const fakeQuery = vi.fn().mockResolvedValue({ count: 1 });
    await h.createMany({ model: 'Ticket', args: { data: { title: 'A' } }, query: fakeQuery });
    expect(fakeQuery).toHaveBeenCalledWith({
      data: { title: 'A', tenantId: TENANT, createdById: USER, updatedById: USER },
    });
  });
});

describe('update', () => {
  it('lanza P2025 si el registro no pertenece al tenant', async () => {
    const h = getHandlers();
    mockPrisma.Ticket.findFirst.mockResolvedValue(null);
    const err = await h
      .update({ model: 'Ticket', args: { where: { id: 't1' }, data: {} }, query: vi.fn() })
      .catch((e: any) => e);
    expect(err.code).toBe('P2025');
    expect(err.message).toContain('unauthorized');
  });

  it('verifica propiedad y agrega updatedById', async () => {
    const h = getHandlers();
    mockPrisma.Ticket.findFirst.mockResolvedValue({ id: 't1' });
    const fakeQuery = vi.fn().mockResolvedValue({ id: 't1' });
    await h.update({ model: 'Ticket', args: { where: { id: 't1' }, data: { title: 'N' } }, query: fakeQuery });
    expect(mockPrisma.Ticket.findFirst).toHaveBeenCalledWith({
      where: { id: 't1', tenantId: TENANT },
      select: { id: true },
    });
    expect(fakeQuery).toHaveBeenCalledWith({
      where: { id: 't1', tenantId: TENANT },
      data: { title: 'N', updatedById: USER },
    });
  });
});

describe('updateMany', () => {
  it('inyecta tenantId y updatedById', async () => {
    const h = getHandlers();
    const fakeQuery = vi.fn().mockResolvedValue({ count: 1 });
    await h.updateMany({ model: 'Ticket', args: { where: { id: 't1' }, data: { status: 'CLOSED' } }, query: fakeQuery });
    expect(fakeQuery).toHaveBeenCalledWith({
      where: { id: 't1', tenantId: TENANT },
      data: { status: 'CLOSED', updatedById: USER },
    });
  });
});

describe('delete', () => {
  it('lanza P2025 si el registro no pertenece al tenant', async () => {
    const h = getHandlers();
    mockPrisma.Part.findFirst.mockResolvedValue(null);
    const err = await h
      .delete({ model: 'Part', args: { where: { id: 'p1' } }, query: vi.fn() })
      .catch((e: any) => e);
    expect(err.code).toBe('P2025');
    expect(err.message).toContain('delete');
  });

  it('elimina tras verificar propiedad', async () => {
    const h = getHandlers();
    mockPrisma.Part.findFirst.mockResolvedValue({ id: 'p1' });
    const fakeQuery = vi.fn().mockResolvedValue({ id: 'p1' });
    await h.delete({ model: 'Part', args: { where: { id: 'p1' } }, query: fakeQuery });
    expect(fakeQuery).toHaveBeenCalledWith({ where: { id: 'p1', tenantId: TENANT } });
  });
});
