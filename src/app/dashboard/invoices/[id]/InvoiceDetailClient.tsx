'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PaymentMethod } from '@prisma/client';
import { registerPayment } from '@/lib/invoice-actions';
import styles from './invoice-detail.module.css';

interface InvoiceDetailClientProps {
  invoice: any;
}

export default function InvoiceDetailClient({ invoice }: InvoiceDetailClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [reference, setReference] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(amount);
  };

  const totalPaid = invoice.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const remaining = Number(invoice.total) - totalPaid;
  const isFullyPaid = invoice.status === 'PAID';

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await registerPayment({
        invoiceId: invoice.id,
        amount: parseFloat(amount),
        paymentMethod: method,
        transactionRef: reference,
      });

      if (result) {
        setIsModalOpen(false);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Error al registrar el pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.backButtonContainer}>
        <Link href="/dashboard/invoices" className={styles.backButton}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Volver a Facturación
        </Link>

        <a 
          href={`/api/invoices/${invoice.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.btnPrint}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Imprimir PDF
        </a>
      </div>

      <div className={styles.invoicePaper}>
        <div className={styles.invoiceHeader}>
          <div className={styles.brand}>
            <h2>FIX-AI</h2>
            <p>Servicio Técnico Profesional</p>
          </div>
          <div className={styles.invoiceTitle}>
            <h1>FACTURA</h1>
            <p>{invoice.invoiceNumber}</p>
            {isFullyPaid && (
              <div className={styles.paidBadge}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                PAGADO
              </div>
            )}
          </div>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoBlock}>
            <h3>Facturar a</h3>
            <p><strong>{invoice.customerName}</strong></p>
            <p>NIT: {invoice.customerNIT || 'Consumidor Final'}</p>
            {invoice.customerAddress && <p>{invoice.customerAddress}</p>}
          </div>
          <div className={styles.infoBlock}>
            <h3>Detalles</h3>
            <p>Fecha: {new Date(invoice.issuedAt).toLocaleDateString()}</p>
            <p>Ticket: #{invoice.ticket?.ticketNumber || invoice.ticketId.slice(0,8)}</p>
            <p>Equipo: {invoice.ticket?.deviceType} {invoice.ticket?.deviceModel}</p>
          </div>
        </div>

        <div className={styles.itemsSection}>
          <table className={styles.itemTable}>
            <thead>
              <tr>
                <th>Descripción</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {Number(invoice.laborCost) > 0 && (
                <tr>
                  <td><strong>Mano de Obra / Servicios Técnicos</strong></td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(Number(invoice.laborCost))}</td>
                </tr>
              )}
              {invoice.ticket?.partsUsed?.map((usage: any) => (
                <tr key={usage.id}>
                  <td>{usage.part.name} (x{usage.quantity})</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(Number(usage.part.price) * usage.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.summarySection}>
          <div className={styles.summaryTable}>
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>{formatCurrency(Number(invoice.subtotal))}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>IVA ({Number(invoice.taxRate)}%)</span>
              <span>{formatCurrency(Number(invoice.taxAmount))}</span>
            </div>
            {Number(invoice.discountAmount) > 0 && (
              <div className={styles.summaryRow}>
                <span>Descuento</span>
                <span style={{ color: 'var(--color-error-600)', fontWeight: 600 }}>-{formatCurrency(Number(invoice.discountAmount))}</span>
              </div>
            )}
            <div className={`${styles.summaryRow} ${styles.total}`}>
              <span>TOTAL</span>
              <span>{formatCurrency(Number(invoice.total))}</span>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <h3>Notas</h3>
          <p>{invoice.notes || 'Gracias por su preferencia. Este documento respalda la garantía del servicio realizado.'}</p>
        </div>
      </div>

      <section className={styles.paymentSection}>
        <div className={styles.paymentHeader}>
          <h2>Historial de Pagos</h2>
          {!isFullyPaid && (
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setIsModalOpen(true)}>
              Registrar Pago
            </button>
          )}
        </div>

        <div className={styles.paymentList}>
          {invoice.payments.length > 0 ? (
            invoice.payments.map((p: any) => (
              <div key={p.id} className={styles.paymentItem}>
                <div className={styles.paymentInfo}>
                  <span className={styles.paymentMethod}>{p.paymentMethod}</span>
                  <span className={styles.paymentDate}>
                    {new Date(p.paidAt).toLocaleString()} - Recibido por: {p.receivedBy?.name || 'Sistema'}
                  </span>
                  {p.transactionRef && <span className={styles.paymentDate}>Ref: {p.transactionRef}</span>}
                </div>
                <div className={styles.paymentAmount}>
                  +{formatCurrency(Number(p.amount))}
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState} style={{ background: 'var(--color-surface)', borderRadius: '1rem', border: '1px dashed var(--color-border-medium)' }}>
              No hay pagos registrados para esta factura.
            </div>
          )}
        </div>
      </section>

      {/* Modal de Pago */}
      {isModalOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-gray-800)', marginBottom: '0.5rem' }}>Registrar Pago</h2>
              <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>Deuda pendiente: <strong>{formatCurrency(remaining)}</strong></p>
            </div>

            <form onSubmit={handleRegisterPayment}>
              {error && <div className={styles.errorMessage} style={{ color: 'var(--color-error-600)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
              
              <div className={styles.formGroup}>
                <label>Monto a Pagar</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  max={remaining}
                  className={styles.input}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Método de Pago</label>
                <select 
                  className={styles.select}
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                >
                  <option value="CASH">Efectivo</option>
                  <option value="CARD">Tarjeta (Débito/Crédito)</option>
                  <option value="TRANSFER">Transferencia Bancaria</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Referencia (Opcional)</label>
                <input 
                  type="text" 
                  className={styles.input}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="No. de boleta o transacción"
                />
              </div>

              <div className={styles.buttonGroup}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={isSubmitting}>
                  {isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}