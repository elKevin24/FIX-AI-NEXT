import { describe, it, expect, vi, beforeEach } from 'vitest';
import { duplicateServiceTemplate, createTicketFromTemplate } from './service-template-actions';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';

// Mock dependencies
vi.mock('@/auth');
vi.mock('@/lib/tenant-prisma');
vi.mock('next/cache');
vi.mock('@/lib/ticket-notifications');

describe('service-template-actions', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      tenantId: 'tenant-1',
      role: 'ADMIN',
    },
  };

  const mockDb: any = {
    serviceTemplate: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue(mockSession);
    (getTenantPrisma as any).mockReturnValue(mockDb);
  });

  describe('duplicateServiceTemplate', () => {
    it('should throw "No autorizado" if no session', async () => {
      (auth as any).mockResolvedValue(null);
      await expect(duplicateServiceTemplate('temp-1')).rejects.toThrow('No autorizado');
    });

    it('should throw "Permiso denegado" if not admin', async () => {
      (auth as any).mockResolvedValue({ user: { ...mockSession.user, role: 'TECHNICIAN' } });
      await expect(duplicateServiceTemplate('temp-1')).rejects.toThrow('Permiso denegado');
    });

    it('should throw "Plantilla no encontrada" if template belongs to another tenant', async () => {
      const otherTenantTemplate = {
        id: 'temp-1',
        name: 'Other',
        tenantId: 'other-tenant',
      };
      mockDb.serviceTemplate.findUnique.mockResolvedValue(otherTenantTemplate);
      await expect(duplicateServiceTemplate('temp-1')).rejects.toThrow('Plantilla no encontrada');
    });

    it('should successfully duplicate a template', async () => {
      const originalTemplate = {
        id: 'temp-1',
        name: 'Original',
        category: 'REPAIR',
        defaultTitle: 'Title',
        defaultDescription: 'Desc',
        defaultPriority: 'MEDIUM',
        estimatedDuration: 60,
        laborCost: 100,
        color: '#000',
        icon: 'icon',
        tenantId: 'tenant-1',
        defaultParts: [
          { partId: 'part-1', quantity: 1, required: true }
        ],
      };

      mockDb.serviceTemplate.findUnique.mockResolvedValue(originalTemplate);
      mockDb.serviceTemplate.create.mockResolvedValue({ ...originalTemplate, id: 'temp-2', name: 'Original (Copia)' });

      const result = await duplicateServiceTemplate('temp-1');

      expect(mockDb.serviceTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'temp-1' },
        include: { defaultParts: true },
      });

      expect(mockDb.serviceTemplate.create).toHaveBeenCalled();
      expect(result.name).toBe('Original (Copia)');
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/settings/service-templates');
    });

    it('should throw "Plantilla no encontrada" if template does not exist', async () => {
      mockDb.serviceTemplate.findUnique.mockResolvedValue(null);
      await expect(duplicateServiceTemplate('invalid-id')).rejects.toThrow('Plantilla no encontrada');
    });
  });

  describe('createTicketFromTemplate', () => {

    const mockTx = {
      ticket: { create: vi.fn() },
      part: { updateMany: vi.fn(), findUnique: vi.fn() },
      partUsage: { create: vi.fn() },
      ticketNote: { create: vi.fn() },
    };

    beforeEach(() => {
      mockDb['$transaction'] = vi.fn((callback) => callback(mockTx));
      mockDb['customer'] = { findUnique: vi.fn() };
      mockDb['serviceTemplate'] = { findUnique: vi.fn() };
    });

    it('should successfully create a ticket and consume stock', async () => {
      const templateId = '00000000-0000-0000-0000-000000000001';
      const customerId = '00000000-0000-0000-0000-000000000002';

      const template = {
        id: templateId,
        name: 'Template',
        defaultTitle: 'Title',
        defaultDescription: 'Desc',
        active: true,
        isActive: true,
        defaultPriority: 'MEDIUM',
        tenantId: 'tenant-1',
        defaultParts: [
          { partId: 'part-1', quantity: 2, required: true, part: { name: 'Part 1', quantity: 10 } }
        ],
      };

      const customer = { id: customerId, tenantId: 'tenant-1' };
      const newTicket = { id: 'tick-1', ticketNumber: 'T-100' };

      mockDb.serviceTemplate.findUnique.mockResolvedValue(template);
      mockDb.customer.findUnique.mockResolvedValue(customer);
      mockTx.ticket.create.mockResolvedValue(newTicket);
      mockTx.part.updateMany.mockResolvedValue({ count: 1 });

      // Mock for notification fetch
      mockDb.serviceTemplate.findUnique.mockResolvedValueOnce(template); // first call
      mockDb.serviceTemplate.findUnique.mockResolvedValueOnce(template); // potentially inside loop? no.
      
      // The second call is actually db.ticket.findUnique in the notification block
      mockDb['ticket'] = { findUnique: vi.fn().mockResolvedValue({
        ...newTicket,
        deviceType: 'PC',
        deviceModel: 'Model X',
        status: 'OPEN',
        tenantId: 'tenant-1',
        customer: { id: customerId, name: 'Customer', email: 'cust@test.com' },
        assignedTo: null
      })};

      const formData = new FormData();
      formData.append('templateId', templateId);
      formData.append('deviceType', 'PC');
      formData.append('deviceModel', 'Model X');
      formData.append('customerId', customerId);

      const result = await createTicketFromTemplate(formData);

      expect(mockTx.ticket.create).toHaveBeenCalled();
      expect(mockTx.part.updateMany).toHaveBeenCalledWith({
        where: { id: 'part-1', quantity: { gte: 2 } },
        data: { quantity: { decrement: 2 } },
      });
      expect(mockTx.partUsage.create).toHaveBeenCalled();
      expect(result.id).toBe('tick-1');
      expect(revalidatePath).toHaveBeenCalled();
    });

    it('should throw error if stock is insufficient', async () => {
      const templateId = '00000000-0000-0000-0000-000000000001';
      const customerId = '00000000-0000-0000-0000-000000000002';

      const template = {
        id: templateId,
        isActive: true,
        defaultPriority: 'MEDIUM',
        tenantId: 'tenant-1',
        defaultParts: [
          { partId: 'part-1', quantity: 5, required: true, part: { name: 'Part 1', quantity: 2 } }
        ],
      };

      mockDb.serviceTemplate.findUnique.mockResolvedValue(template);
      mockDb.customer.findUnique.mockResolvedValue({ id: customerId, tenantId: 'tenant-1' });
      mockTx.part.updateMany.mockResolvedValue({ count: 0 });

      const formData = new FormData();
      formData.append('templateId', templateId);
      formData.append('deviceType', 'PC');
      formData.append('deviceModel', 'X');
      formData.append('customerId', customerId);

      await expect(createTicketFromTemplate(formData)).rejects.toThrow(/Stock insuficiente/);
    });
  });
});
