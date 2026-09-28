'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import styles from './print-half-letter.module.css';

interface CustomerData {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  dpi?: string | null;
  nit?: string | null;
}

interface TenantSettingsData {
  businessName?: string | null;
  businessNIT?: string | null;
  businessAddress?: string | null;
  businessPhone?: string | null;
  businessEmail?: string | null;
  currency?: string | null;
}

interface AssignedUserData {
  id: string;
  name?: string | null;
  email: string;
}

interface PartUsageData {
  id: string;
  quantity: number;
  part: {
    id: string;
    name: string;
    sku?: string | null;
    price: string | number;
  };
}

interface ServiceData {
  id: string;
  name: string;
  laborCost: string | number;
}

export interface HalfLetterPrintTicketData {
  id: string;
  ticketNumber?: string | null;
  title: string;
  description: string;
  status: string;
  priority?: string | null;
  deviceType?: string | null;
  deviceModel?: string | null;
  serialNumber?: string | null;
  accessories?: string | null;
  checkInNotes?: string | null;
  createdAt: Date | string;
  dueDate?: Date | string | null;
  estimatedCompletionDate?: Date | string | null;
  customer: CustomerData;
  tenant: {
    id: string;
    name: string;
    settings?: TenantSettingsData | null;
  };
  assignedTo?: AssignedUserData | null;
  partsUsed?: PartUsageData[];
  services?: ServiceData[];
}

interface Props {
  ticket: HalfLetterPrintTicketData;
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    OPEN: 'Abierto',
    WAITING_APPROVAL: 'Esperando Aprobación',
    IN_PROGRESS: 'En Progreso',
    WAITING_FOR_PARTS: 'Esperando Repuestos',
    RESOLVED: 'Resuelto',
    CLOSED: 'Cerrado',
    CANCELLED: 'Cancelado',
    REJECTED: 'Rechazado',
  };
  return labels[status] || status;
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'OPEN':
      return styles['badgeOpen'];
    case 'IN_PROGRESS':
    case 'WAITING_APPROVAL':
    case 'WAITING_FOR_PARTS':
      return styles['badgeProgress'];
    case 'RESOLVED':
      return styles['badgeResolved'];
    default:
      return styles['badgeClosed'];
  }
};

const getPriorityLabel = (priority?: string | null) => {
  if (!priority) return 'Normal';
  const labels: Record<string, string> = {
    LOW: 'Baja',
    MEDIUM: 'Media',
    HIGH: 'Alta',
    URGENT: 'Urgente',
  };
  return labels[priority] || priority;
};

export default function PrintHalfLetterClient({ ticket }: Props) {
  const handlePrint = () => {
    window.print();
  };

  const business = ticket.tenant.settings;
  const workshopName = business?.businessName || ticket.tenant.name;
  const folio = ticket.ticketNumber || `#${ticket.id.slice(0, 8).toUpperCase()}`;

  const createdDate = new Date(ticket.createdAt).toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const dueDate = ticket.dueDate
    ? new Date(ticket.dueDate).toLocaleDateString('es-GT', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const hasItems =
    (ticket.partsUsed && ticket.partsUsed.length > 0) ||
    (ticket.services && ticket.services.length > 0);

  return (
    <div className={styles['pageWrapper']}>
      {/* Barra de Herramientas (Solo pantalla) */}
      <div className={styles['toolbar']}>
        <div className={styles['toolbarGroup']}>
          <Button
            as={Link}
            href={`/dashboard/tickets/${ticket.id}`}
            variant="secondary"
            size="sm"
            leftIcon={<span aria-hidden="true">←</span>}
          >
            Volver al Ticket
          </Button>
        </div>
        <div className={styles['toolbarGroup']}>
          <Button
            as="a"
            href={`/api/tickets/${ticket.id}/pdf/half-letter`}
            download={`ticket-media-carta-${ticket.ticketNumber || ticket.id.slice(0, 8)}.pdf`}
            variant="secondary"
            size="sm"
            leftIcon={<span aria-hidden="true">📥</span>}
          >
            Descargar PDF
          </Button>
          <Button
            onClick={handlePrint}
            variant="primary"
            size="sm"
            leftIcon={<span aria-hidden="true">🖨️</span>}
          >
            Imprimir Media Carta
          </Button>
        </div>
      </div>

      {/* Hoja Media Carta */}
      <div className={styles['sheet']}>
        <div>
          {/* Header */}
          <div className={styles['header']}>
            <div className={styles['companyInfo']}>
              <h1 className={styles['companyName']}>{workshopName}</h1>
              {business?.businessNIT && (
                <p className={styles['companyMeta']}>NIT: {business.businessNIT}</p>
              )}
              {business?.businessAddress && (
                <p className={styles['companyMeta']}>{business.businessAddress}</p>
              )}
              {business?.businessPhone && (
                <p className={styles['companyMeta']}>Tel: {business.businessPhone}</p>
              )}
              {business?.businessEmail && (
                <p className={styles['companyMeta']}>{business.businessEmail}</p>
              )}
            </div>
            <div className={styles['folioBadge']}>
              <p className={styles['folioTitle']}>Orden de Servicio</p>
              <p className={styles['folioNumber']}>{folio}</p>
              <p className={styles['folioDate']}>Ingreso: {createdDate}</p>
              {dueDate && <p className={styles['folioDate']}>Entrega: {dueDate}</p>}
            </div>
          </div>

          {/* Grid de 2 Columnas: Cliente y Equipo */}
          <div className={styles['gridTwoCols']}>
            {/* Cliente */}
            <div className={styles['cardBox']}>
              <h2 className={styles['boxTitle']}>Datos del Cliente</h2>
              <div className={styles['fieldRow']}>
                <span className={styles['fieldLabel']}>Nombre:</span>
                <span className={styles['fieldValue']}>{ticket.customer.name}</span>
              </div>
              {ticket.customer.phone && (
                <div className={styles['fieldRow']}>
                  <span className={styles['fieldLabel']}>Teléfono:</span>
                  <span className={styles['fieldValue']}>{ticket.customer.phone}</span>
                </div>
              )}
              {ticket.customer.nit && (
                <div className={styles['fieldRow']}>
                  <span className={styles['fieldLabel']}>NIT:</span>
                  <span className={styles['fieldValue']}>{ticket.customer.nit}</span>
                </div>
              )}
              {ticket.customer.dpi && (
                <div className={styles['fieldRow']}>
                  <span className={styles['fieldLabel']}>DPI:</span>
                  <span className={styles['fieldValue']}>{ticket.customer.dpi}</span>
                </div>
              )}
              {ticket.customer.email && (
                <div className={styles['fieldRow']}>
                  <span className={styles['fieldLabel']}>Email:</span>
                  <span className={styles['fieldValue']}>{ticket.customer.email}</span>
                </div>
              )}
            </div>

            {/* Equipo */}
            <div className={styles['cardBox']}>
              <h2 className={styles['boxTitle']}>Datos del Equipo</h2>
              <div className={styles['fieldRow']}>
                <span className={styles['fieldLabel']}>Equipo:</span>
                <span className={styles['fieldValue']}>
                  {ticket.deviceModel || ticket.title} {ticket.deviceType ? `(${ticket.deviceType})` : ''}
                </span>
              </div>
              {ticket.serialNumber && (
                <div className={styles['fieldRow']}>
                  <span className={styles['fieldLabel']}>Serie/IMEI:</span>
                  <span className={styles['fieldValue']}>{ticket.serialNumber}</span>
                </div>
              )}
              <div className={styles['fieldRow']}>
                <span className={styles['fieldLabel']}>Estado:</span>
                <span className={styles['fieldValue']}>
                  <span className={`${styles['badge']} ${getStatusBadgeClass(ticket.status)}`}>
                    {getStatusLabel(ticket.status)}
                  </span>{' '}
                  ({getPriorityLabel(ticket.priority)})
                </span>
              </div>
              {ticket.accessories && (
                <div className={styles['fieldRow']}>
                  <span className={styles['fieldLabel']}>Accesorios:</span>
                  <span className={styles['fieldValue']}>{ticket.accessories}</span>
                </div>
              )}
              {ticket.assignedTo && (
                <div className={styles['fieldRow']}>
                  <span className={styles['fieldLabel']}>Técnico:</span>
                  <span className={styles['fieldValue']}>
                    {ticket.assignedTo.name || ticket.assignedTo.email}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Problema Reportado */}
          <div className={styles['sectionBox']}>
            <h2 className={styles['boxTitle']}>Motivo de Ingreso / Falla Reportada</h2>
            <p className={styles['descText']}>{ticket.description || 'Sin descripción detallada.'}</p>
            {ticket.checkInNotes && (
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.68rem', color: '#b45309', fontWeight: 600 }}>
                Estado de recepción: {ticket.checkInNotes}
              </p>
            )}
          </div>

          {/* Servicios y Repuestos */}
          {hasItems && (
            <div className={styles['sectionBox']}>
              <h2 className={styles['boxTitle']}>Servicios y Repuestos Acordados</h2>
              <table className={styles['itemsTable']}>
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th className={styles['alignCenter']}>Cant.</th>
                    <th className={styles['alignRight']}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {ticket.services?.map((svc) => (
                    <tr key={svc.id}>
                      <td>{svc.name}</td>
                      <td className={styles['alignCenter']}>1</td>
                      <td className={styles['alignRight']}>
                        Q{Number(svc.laborCost || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {ticket.partsUsed?.map((pu) => (
                    <tr key={pu.id}>
                      <td>{pu.part.name}</td>
                      <td className={styles['alignCenter']}>{pu.quantity}</td>
                      <td className={styles['alignRight']}>
                        Q{(Number(pu.part.price || 0) * pu.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Términos y Condiciones */}
          <div className={styles['termsBox']}>
            <p className={styles['termsTitle']}>Condiciones del Servicio</p>
            <ol className={styles['termsList']}>
              <li>Todo diagnóstico y presupuesto inicial está sujeto a revisión técnica detallada.</li>
              <li>El taller no se responsabiliza por datos o software no respaldados previamente.</li>
              <li>Equipos no retirados tras 30 días de notificación generarán recargos de almacenaje.</li>
              <li>Es indispensable presentar este comprobante para la entrega y retiro del equipo.</li>
            </ol>
          </div>
        </div>

        {/* Firmas y Footer */}
        <div>
          <div className={styles['signatureSection']}>
            <div className={styles['signatureBox']}>
              <div className={styles['signatureLine']} />
              <p className={styles['signatureName']}>{ticket.customer.name}</p>
              <p className={styles['signatureRole']}>Firma del Cliente (Aceptación)</p>
            </div>
            <div className={styles['signatureBox']}>
              <div className={styles['signatureLine']} />
              <p className={styles['signatureName']}>
                {ticket.assignedTo?.name || ticket.assignedTo?.email || workshopName}
              </p>
              <p className={styles['signatureRole']}>Firma de Recepción / Taller</p>
            </div>
          </div>

          <div className={styles['footer']}>
            <p className={styles['footerText']}>
              Documento generado por FIX-AI • Formato Media Carta (5.5&quot; x 8.5&quot;)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
