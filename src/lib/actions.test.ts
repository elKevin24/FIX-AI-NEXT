import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCustomer, updateCustomer, createPart, updatePart, authenticate, getTicketById } from './actions';
import { auth, signIn } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { prisma } from '@/lib/prisma';
import { AuthError } from 'next-auth';
import { notFound } from 'next/navigation';

// Mock dependencies
vi.mock('@/auth', () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock('@/lib/tenant-prisma');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    ticket: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  }
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  createNotification: vi.fn(),
}));

vi.mock('./ticket-notifications', () => ({
  notifyLowStock: vi.fn(),
  notifyTicketCreated: vi.fn(),
  notifyTicketStatusChange: vi.fn(),
  notifyTechnicianAssigned: vi.fn(),
}));

describe('actions.ts - System Actions', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      tenantId: 'tenant-1',
      role: 'ADMIN',
      email: 'admin@test.com'
    },
  };

  const mockDb: any = {
    customer: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    part: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    ticket: {
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
    },
    partUsage: {
        create: vi.fn(),
        delete: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
    },
    ticketService: {
        create: vi.fn(),
        delete: vi.fn(),
        findUnique: vi.fn(),
    },
    serviceTemplate: {
        findUnique: vi.fn(),
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue(mockSession);
    (getTenantPrisma as any).mockReturnValue(mockDb);
  });
  
  describe('Authentication & Search', () => {
      describe('authenticate', () => {
          it('should call signIn with credentials', async () => {
              const formData = new FormData();
              formData.append('email', 'test@test.com');
              formData.append('password', 'password');

              await authenticate(undefined, formData);

              expect(signIn).toHaveBeenCalledWith('credentials', {
                  email: 'test@test.com',
                  password: 'password',
                  redirectTo: '/dashboard',
              });
          });

          it('should return error message on invalid credentials', async () => {
              const formData = new FormData();
              // Use real AuthError if possible, but mocking it might be safer if next-auth is hard to instantiate
              // However, since we import it from next-auth which is NOT mocked, we use the real class.
              // We need to subclass it because AuthError might be abstract or need type property handling.
              
              class CustomAuthError extends AuthError {
                  constructor(type: string) {
                      super(type);
                      this.type = type;
                  }
              }
              
              const authError = new CustomAuthError('CredentialsSignin');
              (signIn as any).mockRejectedValueOnce(authError);
              
              const result = await authenticate(undefined, formData);
              expect(result).toBe('Invalid credentials.');
          });

          it('should throw generic error on other failures', async () => {
              const formData = new FormData();
              (signIn as any).mockRejectedValueOnce(new Error('Random error'));
              
              await expect(authenticate(undefined, formData)).rejects.toThrow('Random error');
          });
      });

      describe('getTicketById', () => {
          it('should return ticket if found by UUID', async () => {
              const uuid = '12345678-1234-1234-1234-1234567890ab';
              const mockTicket = { id: uuid, title: 'Laptop Issue' };
              (prisma.ticket.findUnique as any).mockResolvedValue(mockTicket);

              const result = await getTicketById(uuid);
              expect(result).toEqual(mockTicket);
              expect(prisma.ticket.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: uuid } }));
          });

          it('should search by short ID if not found by UUID', async () => {
              const shortId = '12345678';
              (prisma.ticket.findUnique as any).mockResolvedValue(null);
              const mockTicket = { id: '12345678-full-uuid', title: 'PC Fix' };
              (prisma.ticket.findFirst as any).mockResolvedValue(mockTicket);

              const result = await getTicketById(shortId);
              expect(result).toEqual(mockTicket);
              expect(prisma.ticket.findFirst).toHaveBeenCalledWith(expect.objectContaining({ 
                  where: { id: { startsWith: shortId } } 
              }));
          });

          it('should call notFound if ticket not found', async () => {
              (prisma.ticket.findUnique as any).mockResolvedValue(null);
              (prisma.ticket.findFirst as any).mockResolvedValue(null);

              await getTicketById('invalid-id');
              expect(notFound).toHaveBeenCalled();
          });
      });
  });

  describe('createCustomer', () => {
    it('should validate customer data', async () => {
      const formData = new FormData();
      formData.append('name', ''); 
      const result = await createCustomer({}, formData);
      expect(result.message).toBe('El nombre es requerido');
    });

    it('should create customer', async () => {
      const formData = new FormData();
      formData.append('name', 'John');
      formData.append('email', 'john@test.com');
      mockDb.customer.create.mockResolvedValue({ id: '1', name: 'John' });

      await createCustomer({}, formData);
      
      expect(mockDb.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'John', email: 'john@test.com' })
      });
    });
  });

  describe('createPart', () => {
    it('should validate part data', async () => {
      const formData = new FormData();
      formData.append('name', 'Screen');
      formData.append('quantity', '-5'); 

      const result = await createPart({}, formData);
      expect(result.message).toBe('La cantidad no puede ser negativa');
    });

    it('should create part', async () => {
      const formData = new FormData();
      formData.append('name', 'Battery');
      formData.append('quantity', '10');
      formData.append('cost', '15');
      formData.append('price', '30');

      mockDb.part.create.mockResolvedValue({ id: 'part-1', name: 'Battery' });

      await createPart({}, formData);

      expect(mockDb.part.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Battery',
          quantity: 10,
          cost: 15,
          price: 30
        })
      });
    });
  });

  describe('updateCustomer', () => {
    it('should successfully update a customer', async () => {
      const customerId = '00000000-0000-0000-0000-000000000001';
      const formData = new FormData();
      formData.append('customerId', customerId);
      formData.append('name', 'Jane Doe');

      mockDb.customer.findUnique.mockResolvedValue({ id: customerId, tenantId: 'tenant-1' });
      mockDb.customer.update.mockResolvedValue({ id: customerId, name: 'Jane Doe' });

      await updateCustomer({}, formData);

      expect(mockDb.customer.update).toHaveBeenCalledWith({
        where: { id: customerId },
        data: expect.objectContaining({ name: 'Jane Doe' })
      });
    });

    it('should return unauthorized message if session is missing', async () => {
        (auth as any).mockResolvedValue(null);
        const formData = new FormData();
        const result = await updateCustomer({}, formData);
        expect(result.message).toBe('No autorizado');
    });
  });

  describe('updatePart', () => {
    it('should successfully update a part and check for low stock', async () => {
      const partId = '00000000-0000-0000-0000-000000000002';
      const formData = new FormData();
      formData.append('partId', partId);
      formData.append('name', 'Updated Screen');
      formData.append('quantity', '2'); 
      formData.append('cost', '10');
      formData.append('price', '20');

      const existingPart = { id: partId, tenantId: 'tenant-1' };
      const updatedPart = { 
        id: partId, 
        name: 'Updated Screen', 
        quantity: 2, 
        minStock: 5, 
        tenantId: 'tenant-1' 
      };
      
      mockDb.part.findUnique.mockResolvedValue(existingPart);
      mockDb.part.update.mockResolvedValue(updatedPart);
      mockDb.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      await updatePart({}, formData);

      expect(mockDb.part.update).toHaveBeenCalled();
      expect(mockDb.user.findMany).toHaveBeenCalled();
    });
  });
});
