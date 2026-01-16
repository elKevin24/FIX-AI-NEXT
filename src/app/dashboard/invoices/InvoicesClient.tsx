'use client';

import { useState } from 'react';
import Link from 'next/link';
import { InvoiceStatus } from '@prisma/client';
import styles from './invoices.module.css';

interface InvoicesClientProps {
  initialInvoices: any[];
}

export default function InvoicesClient({ initialInvoices }: InvoicesClientProps) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrado local
  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    const matchesSearch = inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Estadísticas rápidas
  const stats = {
    total: invoices.reduce((sum, inv) => sum + Number(inv.total), 0),
    paid: invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + Number(inv.total), 0),
    pending: invoices.filter(inv => inv.status === 'PENDING').reduce((sum, inv) => sum + Number(inv.total), 0),
    count: invoices.length
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(amount);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PAID: 'Pagado',
      PENDING: 'Pendiente',
      CANCELLED: 'Cancelado',
      OVERDUE: 'Vencido',
      DRAFT: 'Borrador'
    };
    return labels[status] || status;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Facturación</h1>
          <p>Consulta y gestiona las facturas generadas a partir de tickets.</p>
        </div>
      </header>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Facturado</span>
          <span className={styles.statValue}>{formatCurrency(stats.total)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Cobrado</span>
          <span className={styles.statValue} style={{ color: '#16a34a' }}>{formatCurrency(stats.paid)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Pendiente</span>
          <span className={styles.statValue} style={{ color: '#ca8a04' }}>{formatCurrency(stats.pending)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Cant. Facturas</span>
          <span className={styles.statValue}>{stats.count}</span>
        </div>
      </section>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Buscar</label>
          <input 
            type="text" 
            placeholder="No. Factura o Cliente..." 
            className={styles.input}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label>Estado</label>
          <select 
            className={styles.select}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="PAID">Pagados</option>
            <option value="PENDING">Pendientes</option>
            <option value="CANCELLED">Cancelados</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No. Factura</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Ticket Relevante</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td><strong>{invoice.invoiceNumber}</strong></td>
                  <td>{new Date(invoice.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className={styles.customerName}>{invoice.customerName}</span>
                    <span className={styles.ticketInfo}>NIT: {invoice.customerNIT || 'C/F'}</span>
                  </td>
                  <td>
                    {invoice.ticket ? (
                      <div className={styles.ticketInfo}>
                        #{invoice.ticket.ticketNumber} - {invoice.ticket.deviceType} {invoice.ticket.deviceModel}
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[`status_${invoice.status}`]}`}>
                      {getStatusLabel(invoice.status)}
                    </span>
                  </td>
                  <td className={styles.amount}>{formatCurrency(Number(invoice.total))}</td>
                  <td className={styles.actions}>
                    <Link href={`/dashboard/invoices/${invoice.id}`} className={styles.viewButton} title="Ver detalle">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  No se encontraron facturas que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
