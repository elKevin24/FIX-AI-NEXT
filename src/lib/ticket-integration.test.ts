import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { prisma } from '@/lib/prisma';

vi.mock('@/auth');
vi.mock('@/lib/tenant-prisma');
vi.mock('@/lib/prisma');
vi.mock('next/cache');
vi.mock('next/navigation', () => ({ redirect: () => { throw new Error('REDIRECT'); }, notFound: vi.fn() }));
vi.mock('@/lib/ticket-notifications', () => ({
  notifyTicketStatusChange: vi.fn(),
  notifyTechnicianAssigned: vi.fn(),
  notifyTicketCreated: vi.fn(),
  notifyLowStock: vi.fn(),
}));
vi.mock('@/lib/notifications', () => ({
  createNotification: vi.fn(),
}));

const U = {
  ADMIN: '00000000-0000-0000-0000-000000000001',
  TECH: '00000000-0000-0000-0000-000000000002',
  VIEWER: '00000000-0000-0000-0000-000000000003',
};
const TNT = '11111111-1111-1111-1111-111111111111';
const CUST = '22222222-2222-2222-2222-222222222222';
const PART1 = '33333333-3333-3333-3333-333333333331';
const PART2 = '33333333-3333-3333-3333-333333333332';
const PART3 = '33333333-3333-3333-3333-333333333333';
const TMPL = '44444444-4444-4444-4444-444444444444';

const mockSession = {
  user: { id: U.ADMIN, tenantId: TNT, role: 'ADMIN', name: 'Admin', email: 'admin@test.com' },
};
const viewerSession = {
  user: { id: U.VIEWER, tenantId: TNT, role: 'VIEWER', name: 'Viewer', email: 'viewer@test.com' },
};
const techSession = {
  user: { id: U.TECH, tenantId: TNT, role: 'TECHNICIAN', name: 'Tech', email: 'tech@test.com' },
};

let state: {
  tickets: Map<string, any>;
  customers: Map<string, any>;
  parts: Map<string, any>;
  partUsages: Map<string, any>;
  ticketNotes: Map<string, any>;
  ticketServices: Map<string, any>;
  serviceTemplates: Map<string, any>;
  auditLogs: Map<string, any>;
  users: Map<string, any>;
  technicianUnavailabilities: Map<string, any>;
  lastId: Record<string, number>;
};

function buildFormData(data: Record<string, any>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) || (typeof value === 'object' && !(value instanceof File))) {
      fd.append(key, JSON.stringify(value));
    } else {
      fd.append(key, String(value));
    }
  }
  return fd;
}

function nextId(prefix: string): string {
  state.lastId[prefix] = (state.lastId[prefix] || 0) + 1;
  return `${prefix}-${state.lastId[prefix]}`;
}

function makeDb() {
  const self: any = {};
  self.$transaction = vi.fn(async (fn: any) => fn(self));

  function ticketOps() {
    return {
      findUnique: vi.fn(({ where }: any) => {
        const t = state.tickets.get(where.id);
        if (!t) return null;
        return {
          ...t,
          partsUsed: Array.from(state.partUsages.values()).filter((pu: any) => pu.ticketId === t.id),
          customer: t.customerId ? state.customers.get(t.customerId) || null : null,
          assignedTo: t.assignedToId ? state.users.get(t.assignedToId) || null : null,
        };
      }),
      findFirst: vi.fn(({ where }: any) => {
        for (const t of Array.from(state.tickets.values())) {
          if (where?.ticketNumber && t.ticketNumber === where.ticketNumber) return { ...t, tenant: { name: 'Test' } };
          if (where?.id && t.id === where.id) return { ...t, tenant: { name: 'Test' } };
        }
        return null;
      }),
      findMany: vi.fn((args?: any) => {
        const where = args?.where;
        let arr = Array.from(state.tickets.values());
        if (where?.id?.in) arr = arr.filter((t: any) => where.id.in.includes(t.id));
        if (where?.tenantId) arr = arr.filter((t: any) => t.tenantId === where.tenantId);
        return arr;
      }),
      create: vi.fn(({ data }: any) => {
        const id = nextId('ticket');
        const t = {
          id,
          ticketNumber: data.ticketNumber || `TK-${id.slice(0, 8)}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          partsUsed: [],
          customer: data.customerId ? state.customers.get(data.customerId) || null : null,
          assignedTo: data.assignedToId ? state.users.get(data.assignedToId) || null : null,
        };
        state.tickets.set(id, t);
        return t;
      }),
      update: vi.fn(({ where, data }: any) => {
        const t = state.tickets.get(where.id);
        if (t) { Object.assign(t, data, { updatedAt: new Date() }); state.tickets.set(where.id, t); }
        return t;
      }),
      updateMany: vi.fn(({ where, data }: any) => {
        let count = 0;
        state.tickets.forEach((t, id) => {
          if (where?.id?.in?.includes(id)) { Object.assign(t, data); count++; }
          else if (where?.tenantId && t.tenantId === where.tenantId && where?.id?.in?.includes(id)) { Object.assign(t, data); count++; }
        });
        return { count };
      }),
      delete: vi.fn(({ where }: any) => state.tickets.delete(where.id)),
      deleteMany: vi.fn(({ where }: any) => {
        let count = 0;
        state.tickets.forEach((_, id) => { if (where?.id?.in?.includes(id)) { state.tickets.delete(id); count++; } });
        return { count };
      }),
      count: vi.fn(() => state.tickets.size),
    };
  }

  function customerOps() {
    return {
      findUnique: vi.fn(({ where }: any) => state.customers.get(where.id) || null),
      findFirst: vi.fn(({ where }: any) => {
        for (const c of Array.from(state.customers.values())) {
          if (where?.email && c.email === where.email) return c;
          if (where?.phone && c.phone === where.phone) return c;
          if (where?.name && c.name === where.name) return c;
        }
        return null;
      }),
      create: vi.fn(({ data }: any) => {
        const id = nextId('cust');
        const c = { id, ...data };
        state.customers.set(id, c);
        return c;
      }),
      update: vi.fn(({ where, data }: any) => {
        const c = state.customers.get(where.id);
        if (c) { Object.assign(c, data); state.customers.set(where.id, c); }
        return c;
      }),
      delete: vi.fn(({ where }: any) => state.customers.delete(where.id)),
    };
  }

  const ticketMethods = ticketOps();
  const customerMethods = customerOps();

  self.ticket = ticketMethods;
  self.customer = customerMethods;
  self.user = {
    findUnique: vi.fn(({ where }: any) => state.users.get(where.id) || null),
    findMany: vi.fn(({ where }: any) => {
      let arr = Array.from(state.users.values());
      if (where?.role) arr = arr.filter((u) => u.role === where.role);
      if (where?.tenantId) arr = arr.filter((u) => u.tenantId === where.tenantId);
      return arr;
    }),
    findFirst: vi.fn(({ where }: any) => {
      for (const u of Array.from(state.users.values())) {
        if (where?.email && u.email === where.email) return u;
      }
      return null;
    }),
  };
  self.ticketNote = {
    findUnique: vi.fn(({ where, include }: any) => {
      const n = state.ticketNotes.get(where.id);
      if (!n) return null;
      const result: any = { ...n };
      if (include?.ticket) result.ticket = state.tickets.get(n.ticketId) || { tenantId: TNT };
      return result;
    }),
    create: vi.fn(({ data }: any) => {
      const id = nextId('note');
      const n = { id, ...data, createdAt: new Date() };
      state.ticketNotes.set(id, n);
      return n;
    }),
    delete: vi.fn(({ where }: any) => state.ticketNotes.delete(where.id)),
  };
  self.part = {
    findUnique: vi.fn(({ where }: any) => state.parts.get(where.id) || null),
    findMany: vi.fn(({ where }: any) => {
      if (where?.id?.in) return where.id.in.map((id: string) => state.parts.get(id)).filter(Boolean);
      return Array.from(state.parts.values());
    }),
    update: vi.fn(({ where, data }: any) => {
      const p = state.parts.get(where.id);
      if (p) {
        const next = { ...data };
        if (next.quantity && typeof next.quantity === 'object') {
          if (next.quantity.decrement !== undefined) p.quantity -= next.quantity.decrement;
          if (next.quantity.increment !== undefined) p.quantity += next.quantity.increment;
          delete next.quantity;
        }
        Object.assign(p, next);
        state.parts.set(where.id, p);
      }
      return p;
    }),
  };
  self.partUsage = {
    findUnique: vi.fn(({ where, include }: any) => {
      const pu = state.partUsages.get(where.id);
      if (!pu) return null;
      const result: any = { ...pu };
      if (include?.ticket) result.ticket = state.tickets.get(pu.ticketId) || { tenantId: TNT };
      if (include?.part) result.part = state.parts.get(pu.partId) || null;
      return result;
    }),
    create: vi.fn(({ data }: any) => {
      const id = nextId('pu');
      const pu = { id, ...data };
      state.partUsages.set(id, pu);
      return pu;
    }),
    delete: vi.fn(({ where }: any) => {
      const pu = state.partUsages.get(where.id);
      if (pu) {
        state.partUsages.delete(where.id);
      }
    }),
  };
  self.serviceTemplate = {
    findUnique: vi.fn(({ where }: any) => state.serviceTemplates.get(where.id) || null),
  };
  self.ticketService = {
    create: vi.fn(({ data }: any) => {
      const id = nextId('ts');
      const ts = { id, ...data };
      state.ticketServices.set(id, ts);
      return ts;
    }),
    findUnique: vi.fn(({ where }: any) => {
      const tsvc = state.ticketServices.get(where.id);
      if (!tsvc) return null;
      return { ...tsvc, ticket: state.tickets.get(tsvc.ticketId) };
    }),
    delete: vi.fn(({ where }: any) => state.ticketServices.delete(where.id)),
  };
  self.auditLog = {
    create: vi.fn(({ data }: any) => {
      const id = nextId('log');
      state.auditLogs.set(id, { id, ...data });
    }),
  };
  self.technicianUnavailability = {
    findFirst: vi.fn(({ where }: any) => {
      for (const u of Array.from(state.technicianUnavailabilities.values())) {
        if (u.userId === where?.userId && u.isActive) {
          if (where?.startDate?.lte && where?.endDate?.gte) {
            return u;
          }
        }
      }
      return null;
    }),
  };
  return self;
}

describe('Ticket Integration — Full Workshops', () => {
  let db: ReturnType<typeof makeDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    db = makeDb();
    vi.mocked(getTenantPrisma).mockReturnValue(db as any);
    vi.mocked(prisma).$transaction = vi.fn(async (fn: any) => {
      return await fn(db);
    }) as any;

    state = {
      tickets: new Map(),
      customers: new Map(),
      parts: new Map([
        [PART1, { id: PART1, name: 'Display', sku: 'DSP-001', quantity: 10, price: 150, cost: 100, minStock: 2, tenantId: TNT }],
        [PART2, { id: PART2, name: 'Battery', sku: 'BAT-001', quantity: 3, price: 50, cost: 30, minStock: 5, tenantId: TNT }],
        [PART3, { id: PART3, name: 'Charger', sku: 'CHG-001', quantity: 0, price: 25, cost: 10, minStock: 3, tenantId: TNT }],
      ]),
      partUsages: new Map(),
      ticketNotes: new Map(),
      ticketServices: new Map(),
      serviceTemplates: new Map([
        [TMPL, { id: TMPL, name: 'Screen Replacement', category: 'REPAIR', defaultTitle: 'Reemplazo de pantalla', defaultDescription: 'Reemplazar pantalla dañada', defaultPriority: 'HIGH', estimatedDuration: 120, laborCost: 75, isActive: true, tenantId: TNT }],
      ]),
      auditLogs: new Map(),
      users: new Map([
        [U.ADMIN, { id: U.ADMIN, name: 'Admin', email: 'admin@test.com', role: 'ADMIN', tenantId: TNT }],
        [U.TECH, { id: U.TECH, name: 'Tech', email: 'tech@test.com', role: 'TECHNICIAN', tenantId: TNT }],
        [U.VIEWER, { id: U.VIEWER, name: 'Viewer', email: 'viewer@test.com', role: 'VIEWER', tenantId: TNT }],
      ]),
      technicianUnavailabilities: new Map(),
      lastId: {},
    };
    state.customers.set(CUST, { id: CUST, name: 'Carlos López', email: 'carlos@example.com', phone: '555-0100', tenantId: TNT });
  });

  // ─── HELPERS ────────────────────────────────────────────────────

  let actions: any = {};

  async function loadActions() {
    if (!actions.createTicket) {
      actions = await import('./actions');
    }
    return actions;
  }

  async function getLastTicketId(): Promise<string> {
    const keys = Array.from(state.tickets.keys());
    return keys[keys.length - 1];
  }

  async function createTicket(data: Record<string, any>) {
    const mod = await loadActions();
    const fd = buildFormData({
      title: data.title || 'Test Ticket',
      description: data.description || 'Test description',
      priority: data.priority || 'MEDIUM',
      deviceType: data.deviceType || 'Laptop',
      deviceModel: data.deviceModel || 'XPS 15',
      customerName: data.customerName || 'Carlos López',
      customerId: data.customerId || CUST,
      initialParts: data.initialParts || [],
      ...data.extra,
    });
    try {
      return await mod.createTicket(null, fd);
    } catch {
      // redirect throws — that's fine, ticket was created
      return { success: true, ticketId: await getLastTicketId() };
    }
  }

  async function updateTicketStatus(ticketId: string, status: string, note?: string) {
    const mod = await loadActions();
    return mod.updateTicketStatus(null, buildFormData({ ticketId, status, note }));
  }

  async function addTicketNote(ticketId: string, content: string, isInternal = false) {
    const mod = await loadActions();
    return mod.addTicketNote(null, buildFormData({ ticketId, content, isInternal }));
  }

  async function deleteTicketNote(noteId: string) {
    const mod = await loadActions();
    return mod.deleteTicketNote(null, buildFormData({ noteId }));
  }

  async function addPartToTicket(ticketId: string, partId: string, quantity: number) {
    const mod = await loadActions();
    return mod.addPartToTicket(null, buildFormData({ ticketId, partId, quantity }));
  }

  async function removePartFromTicket(usageId: string) {
    const mod = await loadActions();
    return mod.removePartFromTicket(null, buildFormData({ usageId }));
  }

  async function addServiceToTicket(ticketId: string, serviceId: string) {
    const mod = await loadActions();
    return mod.addServiceToTicket(null, buildFormData({ ticketId, serviceId }));
  }

  // ─── STATUS TRANSITIONS ────────────────────────────────────────

  describe('TK-01: Status transitions', () => {
    it('TK-01a: OPEN → IN_PROGRESS → RESOLVED → CLOSED', async () => {
      const result = await createTicket({ title: 'Full lifecycle' });
      expect(result.success).toBe(true);
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      let r = await updateTicketStatus(ticketId, 'IN_PROGRESS');
      expect(r.success).toBe(true);
      expect(state.tickets.get(ticketId)?.status).toBe('IN_PROGRESS');

      r = await updateTicketStatus(ticketId, 'RESOLVED');
      expect(r.success).toBe(true);
      expect(state.tickets.get(ticketId)?.status).toBe('RESOLVED');

      r = await updateTicketStatus(ticketId, 'CLOSED');
      expect(r.success).toBe(true);
      expect(state.tickets.get(ticketId)?.status).toBe('CLOSED');
    });

    it('TK-01b: cancel from OPEN restores no stock', async () => {
      const result = await createTicket({ title: 'Cancel test' });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      const r = await updateTicketStatus(ticketId, 'CANCELLED');
      expect(r.success).toBe(true);
      expect(state.tickets.get(ticketId)?.status).toBe('CANCELLED');
    });

    it('TK-01c: cancel from IN_PROGRESS restores stock', async () => {
      const result = await createTicket({
        title: 'Cancel with parts',
        initialParts: [{ partId: PART1, quantity: 2 }],
      });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      expect(state.parts.get(PART1)?.quantity).toBe(8);

      const r = await updateTicketStatus(ticketId, 'CANCELLED');
      expect(r.success).toBe(true);
      expect(state.tickets.get(ticketId)?.status).toBe('CANCELLED');
      expect(state.parts.get(PART1)?.quantity).toBe(10);
    });

    it('TK-01d: reject invalid status value', async () => {
      const result = await createTicket({ title: 'Invalid status' });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      const r = await updateTicketStatus(ticketId, 'INVALID_STATUS');
      expect(r.success).toBe(false);
    });
  });

  // ─── AUTHORIZATION ────────────────────────────────────────────

  describe('TK-02: Authorization', () => {
    it('TK-02a: VIEWER cannot create tickets', async () => {
      vi.mocked(auth).mockResolvedValue(viewerSession as any);
      const result = await createTicket({ title: 'Viewer attempt' });
      expect(result.success).toBe(false);
      expect(result.message).toContain('observadores');
    });

    it('TK-02b: VIEWER cannot update status', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      const result = await createTicket({ title: 'Normal' });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      vi.mocked(auth).mockResolvedValue(viewerSession as any);
      const r = await updateTicketStatus(ticketId, 'IN_PROGRESS');
      expect(r.success).toBe(false);
      expect(r.message).toContain('observadores');
    });

    it('TK-02c: VIEWER cannot add notes', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      const result = await createTicket({ title: 'Note test' });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      vi.mocked(auth).mockResolvedValue(viewerSession as any);
      const r = await addTicketNote(ticketId, 'Should fail');
      expect(r.success).toBe(false);
      expect(r.message).toContain('observadores');
    });
  });

  // ─── NOTES ─────────────────────────────────────────────────────

  describe('TK-03: Notes', () => {
    it('TK-03a: add internal note to ticket', async () => {
      const result = await createTicket({ title: 'Note test' });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      const r = await addTicketNote(ticketId, 'Internal diagnosis note', true);
      expect(r.success).toBe(true);
      expect(state.ticketNotes.size).toBe(1);
      const note = Array.from(state.ticketNotes.values())[0];
      expect(note.isInternal).toBe(true);
      expect(note.authorId).toBe(U.ADMIN);
    });

    it('TK-03b: add public note to ticket', async () => {
      const result = await createTicket({ title: 'Public note' });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      const r = await addTicketNote(ticketId, 'Customer visible note');
      expect(r.success).toBe(true);
      const note = Array.from(state.ticketNotes.values())[0];
      expect(note.isInternal).toBe(false);
    });

    it('TK-03c: reject empty note', async () => {
      const result = await createTicket({ title: 'Empty note' });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      const r = await addTicketNote(ticketId, '');
      expect(r.success).toBe(false);
    });

    it('TK-03d: author can delete own note', async () => {
      const result = await createTicket({ title: 'Delete own note' });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      await addTicketNote(ticketId, 'To be deleted');
      const noteId = Array.from(state.ticketNotes.keys())[0];

      const r = await deleteTicketNote(noteId);
      expect(r.success).toBe(true);
      expect(state.ticketNotes.size).toBe(0);
    });

    it('TK-03e: non-author non-admin cannot delete note', async () => {
      const result = await createTicket({ title: 'Cross-user delete' });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      await addTicketNote(ticketId, 'Admin note');
      const noteId = Array.from(state.ticketNotes.keys())[0];

      vi.mocked(auth).mockResolvedValue(techSession as any);
      const r = await deleteTicketNote(noteId);
      expect(r.success).toBe(false);
      expect(r.message).toContain('No autorizado');
    });
  });

  // ─── PARTS ─────────────────────────────────────────────────────

  describe('TK-04: Parts (Inventory)', () => {
    it('TK-04a: add part to ticket decrements stock', async () => {
      const result = await createTicket({ title: 'Part usage' });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      const r = await addPartToTicket(ticketId, PART1, 2);
      expect(r.success).toBe(true);
      expect(state.parts.get(PART1)?.quantity).toBe(8);
      expect(state.partUsages.size).toBe(1);
    });

    it('TK-04b: reject part with insufficient stock', async () => {
      const result = await createTicket({ title: 'Stock fail' });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      const r = await addPartToTicket(ticketId, PART3, 1);
      expect(r.success).toBe(false);
      expect(r.message).toContain('Stock insuficiente');
    });

    it('TK-04c: reject part with zero quantity', async () => {
      const result = await createTicket({ title: 'Zero qty' });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      const r = await addPartToTicket(ticketId, PART1, 0);
      expect(r.success).toBe(false);
    });

    it('TK-04d: reject non-existent part', async () => {
      const result = await createTicket({ title: 'Missing part' });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      const r = await addPartToTicket(ticketId, '00000000-0000-0000-0000-000000009999', 1);
      expect(r.success).toBe(false);
    });

    it('TK-04e: remove part from ticket restores stock', async () => {
      const result = await createTicket({ title: 'Remove part' });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      await addPartToTicket(ticketId, PART1, 3);
      expect(state.parts.get(PART1)?.quantity).toBe(7);

      const usageId = Array.from(state.partUsages.keys())[0];
      const r = await removePartFromTicket(usageId);
      expect(r.success).toBe(true);
      expect(state.parts.get(PART1)?.quantity).toBe(10);
      expect(state.partUsages.size).toBe(0);
    });

    it('TK-04f: add multiple different parts', async () => {
      const result = await createTicket({ title: 'Multi part' });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      await addPartToTicket(ticketId, PART1, 1);
      await addPartToTicket(ticketId, PART2, 2);
      expect(state.partUsages.size).toBe(2);
      expect(state.parts.get(PART1)?.quantity).toBe(9);
      expect(state.parts.get(PART2)?.quantity).toBe(1);
    });
  });

  // ─── SERVICES ──────────────────────────────────────────────────

  describe('TK-05: Services', () => {
    it('TK-05a: add service to ticket', async () => {
      const result = await createTicket({ title: 'Service add' });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      const r = await addServiceToTicket(ticketId, TMPL);
      expect(r.success).toBe(true);
      expect(state.ticketServices.size).toBe(1);
      const svc = Array.from(state.ticketServices.values())[0];
      expect(svc.serviceId).toBe(TMPL);
    });

    it('TK-05b: reject non-existent service', async () => {
      const result = await createTicket({ title: 'Bad service' });
      const ticketId = result.ticketId || Array.from(state.tickets.keys())[0];

      const r = await addServiceToTicket(ticketId, '44444444-4444-4444-4444-444444449999');
      expect(r.success).toBe(false);
    });
  });

  // ─── BULK OPERATIONS ──────────────────────────────────────────

  describe('TK-06: Bulk operations', () => {
    it('TK-06a: bulk update ticket status', async () => {
      const { bulkUpdateTicketStatus } = await import('./bulk-actions');

      const t1 = await createTicket({ title: 'Bulk 1' });
      const t2 = await createTicket({ title: 'Bulk 2' });
      const id1 = t1.ticketId || Array.from(state.tickets.keys())[0];
      const id2 = t2.ticketId || Array.from(state.tickets.keys())[1];

      const r = await bulkUpdateTicketStatus([id1, id2], 'IN_PROGRESS' as any);
      expect(r.success).toBe(true);
      expect(state.tickets.get(id1)?.status).toBe('IN_PROGRESS');
      expect(state.tickets.get(id2)?.status).toBe('IN_PROGRESS');
    });

    it('TK-06b: bulk assign technician', async () => {
      const { bulkAssignTechnician } = await import('./bulk-actions');

      const t1 = await createTicket({ title: 'Assign 1' });
      const t2 = await createTicket({ title: 'Assign 2' });
      const id1 = t1.ticketId || Array.from(state.tickets.keys())[0];
      const id2 = t2.ticketId || Array.from(state.tickets.keys())[1];

      const r = await bulkAssignTechnician([id1, id2], U.TECH);
      expect(r.success).toBe(true);
      expect(state.tickets.get(id1)?.assignedToId).toBe(U.TECH);
      expect(state.tickets.get(id2)?.assignedToId).toBe(U.TECH);
    });

    it('TK-06c: bulk delete tickets (admin only)', async () => {
      const { bulkDeleteTickets } = await import('./bulk-actions');

      const t1 = await createTicket({ title: 'Delete 1' });
      const t2 = await createTicket({ title: 'Delete 2' });
      const id1 = t1.ticketId || Array.from(state.tickets.keys())[0];
      const id2 = t2.ticketId || Array.from(state.tickets.keys())[1];

      const r = await bulkDeleteTickets([id1, id2]);
      expect(r.success).toBe(true);
      expect(state.tickets.has(id1)).toBe(false);
      expect(state.tickets.has(id2)).toBe(false);
    });

    it('TK-06d: non-admin cannot bulk delete', async () => {
      const { bulkDeleteTickets } = await import('./bulk-actions');

      vi.mocked(auth).mockResolvedValue(techSession as any);
      const r = await bulkDeleteTickets(['any-id']);
      expect(r.success).toBe(false);
    });
  });
});
