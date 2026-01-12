import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCustomer, updateCustomer, createPart, updatePart } from './actions';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';

// Mock dependencies
vi.mock('@/auth');
vi.mock('@/lib/tenant-prisma');
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
}));

describe('actions.ts - Customer & Part Actions', () => {
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
      create: vi.fn(),
      update: vi.fn(),
    },
    part: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
        findMany: vi.fn(),
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue(mockSession);
    (getTenantPrisma as any).mockReturnValue(mockDb);
  });

  describe('createCustomer', () => {
    it('should validate customer data using Zod', async () => {
      const formData = new FormData();
      // Name missing
      formData.append('name', ''); 

      const result = await createCustomer({}, formData);
      expect(result.message).toBe('El nombre es requerido');
    });

    it('should successfully create a customer', async () => {
      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('email', 'john@example.com');

      mockDb.customer.create.mockResolvedValue({ id: 'cust-1', name: 'John Doe' });

      const result = await createCustomer({}, formData);
      
      expect(mockDb.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          tenantId: 'tenant-1'
        })
      });
      // createCustomer returns a redirect or nothing on success, but here it returns void or redirects
    });
  });

  describe('createPart', () => {
    it('should validate part data using Zod', async () => {
      const formData = new FormData();
      formData.append('name', 'Screen');
      formData.append('quantity', '-5'); // Invalid

      const result = await createPart({}, formData);
      expect(result.message).toBe('La cantidad no puede ser negativa');
    });

    it('should successfully create a part', async () => {
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
      formData.append('quantity', '2'); // Low stock
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
