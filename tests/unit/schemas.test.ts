import { describe, it, expect } from 'vitest';
import {
  CreateTicketSchema,
  CreateBatchTicketsSchema,
  UpdateTicketSchema,
  CreateUserSchema,
  UpdateUserSchema,
  CreateCustomerSchema,
  UpdateCustomerSchema,
  CreatePartSchema,
  UpdatePartSchema,
  ServiceTemplateSchema,
  CreateTicketFromTemplateSchema,
  AddPartToTemplateSchema,
  UpdateTemplateDefaultPartSchema,
  TechnicianUnavailabilitySchema,
  OpenCashRegisterSchema,
  CashTransactionSchema,
  CloseCashRegisterSchema,
  POSCartItemSchema,
  POSPaymentItemSchema,
  CreatePOSSaleSchema,
  GenerateInvoiceSchema,
  RegisterPaymentSchema,
  DateRangeSchema,
  NotificationFilterSchema,
  NotificationIdSchema,
  SLACheckSchema,
} from '@/lib/schemas';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = '550e8400-e29b-41d4-a716-446655440001';

function expectValid(schema: any, data: any) {
  const result = schema.safeParse(data);
  expect(result.success).toBe(true);
  return result;
}

function expectInvalid(schema: any, data: any, message?: string) {
  const result = schema.safeParse(data);
  expect(result.success).toBe(false);
  if (message) {
    expect(JSON.stringify(result.error?.issues.map((i: any) => i.message))).toContain(message);
  }
  return result;
}

describe('CreateTicketSchema', () => {
  const valid = {
    title: 'Pantalla rota',
    description: 'Se quebró la pantalla',
  };

  it('acepta un ticket válido mínimo', () => {
    expectValid(CreateTicketSchema, valid);
  });

  it('rechaza título vacío', () => {
    expectInvalid(CreateTicketSchema, { ...valid, title: '' }, 'El título es requerido');
  });

  it('rechaza título demasiado largo', () => {
    expectInvalid(CreateTicketSchema, { ...valid, title: 'x'.repeat(256) }, 'El título es demasiado largo');
  });

  it('rechaza descripción vacía', () => {
    expectInvalid(CreateTicketSchema, { ...valid, description: '' }, 'La descripción es requerida');
  });

  it('rechaza estado inválido', () => {
    expectInvalid(CreateTicketSchema, { ...valid, status: 'FOO' }, 'Estado inicial inválido');
  });

  it('rechaza prioridad inválida', () => {
    expectInvalid(CreateTicketSchema, { ...valid, priority: 'NOPE' }, 'Prioridad inválida');
  });

  it('rechaza initialParts con partId que no es UUID', () => {
    expectInvalid(
      CreateTicketSchema,
      { ...valid, initialParts: [{ partId: 'not-a-uuid', quantity: 1 }] },
      'ID de repuesto inválido',
    );
  });

  it('rechaza initialParts con cantidad no positiva', () => {
    expectInvalid(
      CreateTicketSchema,
      { ...valid, initialParts: [{ partId: UUID, quantity: 0 }] },
      'La cantidad debe ser positiva',
    );
  });

  it('rechaza deviceType demasiado largo', () => {
    expectInvalid(CreateTicketSchema, { ...valid, deviceType: 'x'.repeat(51) }, 'tipo de dispositivo');
  });

  it('acepta campos opcionales del dispositivo como null', () => {
    expectValid(CreateTicketSchema, { ...valid, deviceType: null, serialNumber: null });
  });

  it('acepta estado y prioridad válidos', () => {
    expectValid(CreateTicketSchema, { ...valid, status: 'OPEN', priority: 'HIGH' });
  });
});

describe('CreateBatchTicketsSchema', () => {
  const valid = {
    title: 'Ticket A',
    description: 'Desc A',
  };

  it('acepta un arreglo de tickets', () => {
    expectValid(CreateBatchTicketsSchema, [valid, { ...valid, title: 'Ticket B' }]);
  });

  it('rechaza un arreglo con un ticket inválido', () => {
    const result = CreateBatchTicketsSchema.safeParse([valid, { title: '', description: 'x' }]);
    expect(result.success).toBe(false);
  });
});

describe('UpdateTicketSchema', () => {
  const valid = { ticketId: UUID };

  it('acepta un update parcial sin campos opcionales', () => {
    expectValid(UpdateTicketSchema, valid);
  });

  it('rechaza estado inválido', () => {
    expectInvalid(UpdateTicketSchema, { ...valid, status: 'DELETED' }, 'Estado de ticket inválido');
  });

  it('rechaza ticketId no UUID', () => {
    expectInvalid(UpdateTicketSchema, { ticketId: 'abc' }, 'ID de ticket inválido');
  });

  it('acepta assignedToId null', () => {
    expectValid(UpdateTicketSchema, { ...valid, assignedToId: null });
  });
});

describe('CreateUserSchema', () => {
  const valid = { name: 'Juan', email: 'juan@test.com', password: 'secreto1', role: 'TECHNICIAN' };

  it('acepta un usuario válido', () => {
    expectValid(CreateUserSchema, valid);
  });

  it('rechaza email mal formado', () => {
    expectInvalid(CreateUserSchema, { ...valid, email: 'no-es-email' }, 'Formato de email inválido');
  });

  it('rechaza contraseña corta', () => {
    expectInvalid(CreateUserSchema, { ...valid, password: '123' }, 'al menos 6 caracteres');
  });

  it('rechaza rol inválido', () => {
    expectInvalid(CreateUserSchema, { ...valid, role: 'SUPERUSER' }, 'Rol inválido');
  });
});

describe('UpdateUserSchema', () => {
  const valid = { userId: UUID, name: 'Ana', email: 'ana@test.com', role: 'MANAGER' };

  it('acepta sin contraseña (no se actualiza)', () => {
    expectValid(UpdateUserSchema, valid);
  });

  it('acepta contraseña vacía (no se actualiza)', () => {
    expectValid(UpdateUserSchema, { ...valid, password: '' });
  });

  it('rechaza contraseña corta no vacía', () => {
    expectInvalid(UpdateUserSchema, { ...valid, password: '123' }, 'al menos 6 caracteres');
  });

  it('rechaza userId no UUID', () => {
    expectInvalid(UpdateUserSchema, { ...valid, userId: 'x' }, 'ID de usuario inválido');
  });
});

describe('CreateCustomerSchema', () => {
  const valid = { name: 'Cliente A' };

  it('acepta solo el nombre', () => {
    expectValid(CreateCustomerSchema, valid);
  });

  it('acepta email vacío', () => {
    expectValid(CreateCustomerSchema, { ...valid, email: '' });
  });

  it('rechaza email mal formado', () => {
    expectInvalid(CreateCustomerSchema, { ...valid, email: 'mal' }, 'Formato de email inválido');
  });
});

describe('UpdateCustomerSchema', () => {
  it('requiere customerId UUID', () => {
    expectInvalid(UpdateCustomerSchema, { name: 'A', customerId: 'x' }, 'ID de cliente inválido');
  });

  it('acepta un cliente completo válido', () => {
    expectValid(UpdateCustomerSchema, { customerId: UUID, name: 'Cliente', phone: null });
  });
});

describe('CreatePartSchema', () => {
  const valid = { name: 'Batería', quantity: 5, cost: 10.5, price: 25 };

  it('acepta un repuesto válido', () => {
    expectValid(CreatePartSchema, valid);
  });

  it('rechaza cantidad negativa', () => {
    expectInvalid(CreatePartSchema, { ...valid, quantity: -1 }, 'La cantidad no puede ser negativa');
  });

  it('rechaza cantidad decimal', () => {
    expectInvalid(CreatePartSchema, { ...valid, quantity: 2.5 }, 'La cantidad debe ser un entero');
  });

  it('rechaza costo negativo', () => {
    expectInvalid(CreatePartSchema, { ...valid, cost: -5 }, 'El costo no puede ser negativo');
  });

  it('rechaza precio negativo', () => {
    expectInvalid(CreatePartSchema, { ...valid, price: -1 }, 'El precio no puede ser negativo');
  });

  it('rechaza cantidad string', () => {
    expectInvalid(CreatePartSchema, { ...valid, quantity: '5' }, 'Cantidad inválida');
  });
});

describe('UpdatePartSchema', () => {
  it('requiere partId UUID', () => {
    expectInvalid(UpdatePartSchema, { name: 'Batería', quantity: 1, cost: 1, price: 1, partId: 'x' }, 'ID de repuesto inválido');
  });
});

describe('ServiceTemplateSchema', () => {
  const valid = {
    name: 'Cambio de pantalla',
    category: 'REPAIR',
    defaultTitle: 'Pantalla',
    defaultDescription: 'Reemplazo de pantalla',
    defaultPriority: 'High',
  };

  it('acepta una plantilla válida', () => {
    expectValid(ServiceTemplateSchema, valid);
  });

  it('rechaza categoría inválida', () => {
    expectInvalid(ServiceTemplateSchema, { ...valid, category: 'FIX' }, 'Categoría inválida');
  });

  it('rechaza prioridad inválida', () => {
    expectInvalid(ServiceTemplateSchema, { ...valid, defaultPriority: 'Extreme' }, 'Prioridad inválida');
  });

  it('rechaza color no hexadecimal', () => {
    expectInvalid(ServiceTemplateSchema, { ...valid, color: 'rojo' }, 'Color hexadecimal inválido');
  });

  it('acepta color hexadecimal válido', () => {
    expectValid(ServiceTemplateSchema, { ...valid, color: '#FF00AA' });
  });

  it('aplica isActive por defecto a true', () => {
    const result = ServiceTemplateSchema.parse(valid);
    expect(result.isActive).toBe(true);
  });
});

describe('CreateTicketFromTemplateSchema', () => {
  it('acepta datos válidos', () => {
    expectValid(CreateTicketFromTemplateSchema, {
      templateId: UUID,
      customerId: UUID2,
    });
  });

  it('rechaza templateId no UUID', () => {
    expectInvalid(CreateTicketFromTemplateSchema, { templateId: 'x', customerId: UUID2 }, 'ID de plantilla inválido');
  });

  it('rechaza customerId no UUID', () => {
    expectInvalid(CreateTicketFromTemplateSchema, { templateId: UUID, customerId: 'y' }, 'ID de cliente inválido');
  });
});

describe('AddPartToTemplateSchema', () => {
  const valid = { templateId: UUID, partId: UUID2, quantity: 2, required: true };

  it('acepta datos válidos', () => {
    expectValid(AddPartToTemplateSchema, valid);
  });

  it('rechaza cantidad no entera', () => {
    expectInvalid(AddPartToTemplateSchema, { ...valid, quantity: 1.5 }, 'La cantidad debe ser un entero');
  });

  it('rechaza cantidad no positiva', () => {
    expectInvalid(AddPartToTemplateSchema, { ...valid, quantity: 0 }, 'La cantidad debe ser positiva');
  });
});

describe('UpdateTemplateDefaultPartSchema', () => {
  it('requiere id UUID', () => {
    expectInvalid(UpdateTemplateDefaultPartSchema, { id: 'nope', quantity: 1, required: true }, 'ID de parte por defecto inválido');
  });
});

describe('TechnicianUnavailabilitySchema', () => {
  const valid = {
    startDate: '2024-01-01T08:00:00.000Z',
    endDate: '2024-01-03T18:00:00.000Z',
    reason: 'ON_VACATION',
  };

  it('acepta un rango válido', () => {
    const result = expectValid(TechnicianUnavailabilitySchema, valid);
    expect(result.data.startDate).toBeInstanceOf(Date);
    expect(result.data.endDate).toBeInstanceOf(Date);
  });

  it('rechaza endDate anterior a startDate', () => {
    expectInvalid(
      TechnicianUnavailabilitySchema,
      { ...valid, endDate: '2023-12-31T00:00:00.000Z' },
      'La fecha de fin debe ser posterior',
    );
  });

  it('rechaza razón inválida', () => {
    expectInvalid(TechnicianUnavailabilitySchema, { ...valid, reason: 'SOMETHING' }, 'Razón inválida');
  });
});

describe('Cash register schemas', () => {
  it('OpenCashRegisterSchema rechaza saldo inicial negativo', () => {
    expectInvalid(OpenCashRegisterSchema, { name: 'Caja 1', openingBalance: -5 }, 'El saldo inicial no puede ser negativo');
  });

  it('CashTransactionSchema rechaza monto no positivo', () => {
    expectInvalid(
      CashTransactionSchema,
      { cashRegisterId: UUID, type: 'INCOME', amount: 0, description: 'Venta' },
      'El monto debe ser positivo',
    );
  });

  it('CashTransactionSchema rechaza tipo inválido', () => {
    expectInvalid(
      CashTransactionSchema,
      { cashRegisterId: UUID, type: 'LOAN', amount: 10, description: 'x' },
      'Tipo de transacción inválido',
    );
  });

  it('CloseCashRegisterSchema rechaza saldo final negativo', () => {
    expectInvalid(CloseCashRegisterSchema, { cashRegisterId: UUID, closingBalance: -1 }, 'El saldo final no puede ser negativo');
  });
});

describe('POS schemas', () => {
  it('POSCartItemSchema rechaza cantidad no positiva', () => {
    expectInvalid(POSCartItemSchema, { partId: UUID, quantity: 0 }, 'La cantidad debe ser positiva');
  });

  it('POSPaymentItemSchema rechaza método de pago inválido', () => {
    expectInvalid(POSPaymentItemSchema, { amount: 10, paymentMethod: 'BITCOIN' }, 'Método de pago inválido');
  });

  it('CreatePOSSaleSchema rechaza sin items', () => {
    expectInvalid(CreatePOSSaleSchema, { items: [], payments: [{ amount: 10, paymentMethod: 'CASH' }] }, 'Debe agregar al menos un producto');
  });

  it('CreatePOSSaleSchema rechaza sin payments', () => {
    expectInvalid(CreatePOSSaleSchema, { items: [{ partId: UUID, quantity: 1 }], payments: [] }, 'Debe agregar al menos un método de pago');
  });

  it('CreatePOSSaleSchema rechaza descuento negativo', () => {
    expectInvalid(
      CreatePOSSaleSchema,
      { items: [{ partId: UUID, quantity: 1 }], payments: [{ amount: 10, paymentMethod: 'CASH' }], discountAmount: -1 },
      'El descuento no puede ser negativo',
    );
  });

  it('CreatePOSSaleSchema acepta una venta válida', () => {
    expectValid(CreatePOSSaleSchema, {
      items: [{ partId: UUID, quantity: 2 }],
      payments: [{ amount: 50, paymentMethod: 'TRANSFER', transactionRef: 'T-123' }],
      customerName: 'Cliente',
    });
  });
});

describe('Invoice & payment schemas', () => {
  it('GenerateInvoiceSchema rechaza ticketId no UUID', () => {
    expectInvalid(GenerateInvoiceSchema, { ticketId: 'bad' }, 'ID de ticket inválido');
  });

  it('GenerateInvoiceSchema rechaza taxRate negativo', () => {
    expectInvalid(GenerateInvoiceSchema, { ticketId: UUID, taxRate: -1 });
  });

  it('RegisterPaymentSchema rechaza monto no positivo', () => {
    expectInvalid(RegisterPaymentSchema, { invoiceId: UUID, amount: 0, paymentMethod: 'CASH' }, 'El monto debe ser positivo');
  });

  it('RegisterPaymentSchema acepta un pago válido', () => {
    expectValid(RegisterPaymentSchema, { invoiceId: UUID, amount: 100, paymentMethod: 'CARD', transactionRef: null });
  });
});

describe('DateRangeSchema', () => {
  it('transforma fechas string a Date', () => {
    const result = DateRangeSchema.parse({ startDate: '2024-01-01', endDate: '2024-01-31' });
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
  });

  it('rechaza endDate anterior a startDate', () => {
    expectInvalid(DateRangeSchema, { startDate: '2024-02-01', endDate: '2024-01-01' }, 'La fecha de fin debe ser posterior');
  });

  it('acepta fechas opcionales', () => {
    expectValid(DateRangeSchema, {});
  });
});

describe('NotificationFilterSchema', () => {
  it('aplica defaults page=1 limit=20', () => {
    const result = NotificationFilterSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('rechaza limit mayor a 100', () => {
    expectInvalid(NotificationFilterSchema, { limit: 101 });
  });

  it('rechaza page no positivo', () => {
    expectInvalid(NotificationFilterSchema, { page: 0 });
  });
});

describe('NotificationIdSchema', () => {
  it('rechaza id no UUID', () => {
    expectInvalid(NotificationIdSchema, { id: 'abc' }, 'ID de notificación inválido');
  });
});

describe('SLACheckSchema', () => {
  it('acepta sin tenantId', () => {
    expectValid(SLACheckSchema, {});
  });

  it('acepta tenantId UUID', () => {
    expectValid(SLACheckSchema, { tenantId: UUID });
  });

  it('rechaza tenantId no UUID', () => {
    expectInvalid(SLACheckSchema, { tenantId: 'x' }, 'ID de tenant inválido');
  });
});
