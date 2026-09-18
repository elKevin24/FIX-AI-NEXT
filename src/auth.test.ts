import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  compare: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
  },
}));

vi.mock('bcryptjs', () => ({ compare: mocks.compare }));

// Aislamos solo el pipe de next-auth: capturamos la config real que construye auth.ts
// y probamos la función authorize() que la app implementa (vive en provider.options).
vi.mock('next-auth', () => ({
  default: vi.fn(() => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() })),
}));

import NextAuth from 'next-auth';
import './auth';

const calls = (NextAuth as any).mock?.calls;
const config = (calls && calls[0] ? calls[0][0] : { providers: [] }) as {
  providers: Array<{
    id?: string;
    options?: { authorize?: (credentials: Record<string, unknown>) => Promise<unknown> };
  }>;
};
const credentialsProvider = config.providers?.find((p: { id?: string }) => p?.id === 'credentials');
const authorize = credentialsProvider?.options?.authorize ?? (async () => null);

const USER = {
  id: 'user-1',
  email: 'admin@electrofix.com',
  password: 'hashed-password',
  name: 'Admin ElectroFix',
  firstName: 'Admin',
  lastName: 'ElectroFix',
  role: 'ADMIN',
  tenant: { id: 'tenant-1' },
  tenantId: 'tenant-1',
  isActive: true,
  lockedUntil: null,
  passwordMustChange: false,
  failedLoginAttempts: 0,
};

describe('auth authorize (credentials)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindUnique.mockReset();
    mocks.userUpdate.mockReset();
    mocks.compare.mockReset();
  });

  it('autentica credenciales válidas y registra el login exitoso', async () => {
    mocks.userFindUnique.mockResolvedValue({ ...USER });
    mocks.compare.mockResolvedValue(true);

    const user = await authorize({ email: USER.email, password: 'Admin@2024!' });

    expect(user).toEqual(
      expect.objectContaining({
        id: USER.id,
        email: USER.email,
        role: 'ADMIN',
        tenantId: 'tenant-1',
        passwordMustChange: false,
      }),
    );
    expect(mocks.userFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: USER.email } }),
    );
    expect(mocks.compare).toHaveBeenCalledWith('Admin@2024!', USER.password);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: USER.id },
      data: expect.objectContaining({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: expect.any(Date),
      }),
    });
  });

  it('rechaza password incorrecto y registra el intento fallido', async () => {
    mocks.userFindUnique.mockResolvedValue({ ...USER });
    mocks.compare.mockResolvedValue(false);

    const result = await authorize({ email: USER.email, password: 'wrong-password' });

    expect(result).toBeNull();
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: USER.id },
      data: expect.objectContaining({ failedLoginAttempts: 1 }),
    });
  });

  it('rechaza un email inexistente y no registra auditoría', async () => {
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.compare.mockResolvedValue(false);

    const result = await authorize({ email: 'ghost@electrofix.com', password: 'Whatever1!' });

    expect(result).toBeNull();
    expect(mocks.compare).toHaveBeenCalledWith('Whatever1!', expect.any(String));
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it('rechaza una cuenta desactivada', async () => {
    mocks.userFindUnique.mockResolvedValue({ ...USER, isActive: false });

    const result = await authorize({ email: USER.email, password: 'Admin@2024!' });

    expect(result).toBeNull();
    expect(mocks.compare).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it('rechaza una cuenta bloqueada por intentos fallidos', async () => {
    mocks.userFindUnique.mockResolvedValue({
      ...USER,
      lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
    });

    const result = await authorize({ email: USER.email, password: 'Admin@2024!' });

    expect(result).toBeNull();
    expect(mocks.compare).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it('rechaza un password que no cumple el formato mínimo sin consultar la DB', async () => {
    const result = await authorize({ email: USER.email, password: '123' });

    expect(result).toBeNull();
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it('bloquea la cuenta al llegar a 5 intentos fallidos consecutivos', async () => {
    mocks.userFindUnique.mockResolvedValue({ ...USER, failedLoginAttempts: 4 });
    mocks.compare.mockResolvedValue(false);

    const result = await authorize({ email: USER.email, password: 'wrong1' });

    expect(result).toBeNull();
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: USER.id },
      data: expect.objectContaining({
        failedLoginAttempts: 5,
        lockedUntil: expect.any(Date),
      }),
    });
  });
});