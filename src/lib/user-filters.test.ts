import { describe, it, expect } from 'vitest';
import { buildUserWhereClause } from './user-filters';
import type { Prisma } from '@prisma/client';

const TNT = '11111111-1111-1111-1111-111111111111';

describe('buildUserWhereClause', () => {
  it('retorna solo el tenant por defecto', () => {
    expect(buildUserWhereClause({ tenantId: TNT })).toEqual({ tenantId: TNT });
  });

  it('filtrar por rol', () => {
    expect(buildUserWhereClause({ tenantId: TNT, role: 'TECHNICIAN' })).toEqual({
      tenantId: TNT,
      role: 'TECHNICIAN',
    });
  });

  it('filtra por isActive cuando viene explícito', () => {
    expect(buildUserWhereClause({ tenantId: TNT, isActive: true })).toEqual({
      tenantId: TNT,
      isActive: true,
    });
    expect(buildUserWhereClause({ tenantId: TNT, isActive: false })).toEqual({
      tenantId: TNT,
      isActive: false,
    });
  });

  it('no agrega isActive si es undefined (equivalente a includeInactive)', () => {
    expect(buildUserWhereClause({ tenantId: TNT, isActive: undefined })).toEqual({
      tenantId: TNT,
    });
  });

  it('agrega búsqueda insensible a mayúsculas sobre los 4 campos de nombre/email', () => {
    const where: Prisma.UserWhereInput = buildUserWhereClause({
      tenantId: TNT,
      search: 'pablo',
    });

    const or = where.OR as Prisma.UserWhereInput[];
    expect(or).toHaveLength(4);
    expect(or[0]).toEqual({ name: { contains: 'pablo', mode: 'insensitive' } });
    expect(or[1]).toEqual({ email: { contains: 'pablo', mode: 'insensitive' } });
    expect(or.some((c) => c.firstName !== undefined)).toBe(true);
    expect(or.some((c) => c.lastName !== undefined)).toBe(true);
  });

  it('combina tenant, rol, isActive y búsqueda', () => {
    const where: Prisma.UserWhereInput = buildUserWhereClause({
      tenantId: TNT,
      role: 'ADMIN',
      isActive: true,
      search: 'ana',
    });

    expect(where.tenantId).toBe(TNT);
    expect(where.role).toBe('ADMIN');
    expect(where.isActive).toBe(true);
    expect((where.OR as Prisma.UserWhereInput[]).length).toBeGreaterThan(0);
  });
});