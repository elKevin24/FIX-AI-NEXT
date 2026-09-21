import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { isSuperAdmin } from '@/lib/authz';
import { prisma } from '@/lib/prisma';
import PrintHalfLetterClient from './PrintHalfLetterClient';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Imprimir Media Carta - Orden de Servicio',
  description: 'Formato de impresión media carta para orden de servicio y recepción de equipo.',
};

export default async function PrintHalfLetterPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id || !session?.user?.tenantId) {
    redirect('/login');
  }

  const { tenantId, id: userId } = session.user;
  const isSuperAdminUser = isSuperAdmin(session.user);

  const ticketInclude = {
    customer: true,
    tenant: {
      include: {
        settings: true,
      },
    },
    assignedTo: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    partsUsed: {
      include: { part: true },
    },
    services: true,
  };

  let ticket: any;

  if (isSuperAdminUser) {
    ticket = await prisma.ticket.findUnique({
      where: { id },
      include: ticketInclude,
    });
  } else {
    const tenantPrisma = getTenantPrisma(tenantId, userId);
    ticket = await tenantPrisma.ticket.findUnique({
      where: { id },
      include: ticketInclude,
    });
  }

  if (!ticket) {
    notFound();
  }

  type TicketPartUsage = (typeof ticket)['partsUsed'][number];
  type TicketService = (typeof ticket)['services'][number];

  const ticketData = {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    deviceType: ticket.deviceType,
    deviceModel: ticket.deviceModel,
    serialNumber: ticket.serialNumber,
    accessories: ticket.accessories,
    checkInNotes: ticket.checkInNotes,
    createdAt: ticket.createdAt,
    dueDate: ticket.dueDate,
    estimatedCompletionDate: ticket.estimatedCompletionDate,
    customer: {
      id: ticket.customer.id,
      name: ticket.customer.name,
      email: ticket.customer.email,
      phone: ticket.customer.phone,
      address: ticket.customer.address,
      dpi: ticket.customer.dpi,
      nit: ticket.customer.nit,
    },
    tenant: {
      id: ticket.tenant.id,
      name: ticket.tenant.name,
      settings: ticket.tenant.settings
        ? {
            businessName: ticket.tenant.settings.businessName,
            businessNIT: ticket.tenant.settings.businessNIT,
            businessAddress: ticket.tenant.settings.businessAddress,
            businessPhone: ticket.tenant.settings.businessPhone,
            businessEmail: ticket.tenant.settings.businessEmail,
            currency: ticket.tenant.settings.currency,
          }
        : null,
    },
    assignedTo: ticket.assignedTo
      ? {
          id: ticket.assignedTo.id,
          name: ticket.assignedTo.name,
          email: ticket.assignedTo.email,
        }
      : null,
    partsUsed: ticket.partsUsed.map((pu: TicketPartUsage) => ({
      id: pu.id,
      quantity: pu.quantity,
      part: {
        id: pu.part.id,
        name: pu.part.name,
        sku: pu.part.sku,
        price: pu.part.price.toString(),
      },
    })),
    services: ticket.services.map((s: TicketService) => ({
      id: s.id,
      name: s.name,
      laborCost: s.laborCost.toString(),
    })),
  };

  return <PrintHalfLetterClient ticket={ticketData} />;
}
