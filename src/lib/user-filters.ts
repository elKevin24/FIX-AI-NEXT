import type { Prisma, UserRole } from '@prisma/client';

export interface UserListFilters {
  tenantId: string;
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

/**
 * Construye el where de Prisma para listar/filtrar usuarios del tenant.
 * Es la única fuente de verdad para este mapeo (usada por el repositorio y
 * por las server actions), de modo que listar usuarios nunca diverja.
 */
export function buildUserWhereClause(filters: UserListFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = { tenantId: filters.tenantId };

  if (filters.role) {
    where.role = filters.role;
  }
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return where;
}