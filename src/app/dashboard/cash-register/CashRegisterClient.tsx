'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { openCashRegister, closeCashRegister, registerCashTransaction } from '@/lib/cash-register-actions';
import styles from './cash-register.module.css';

interface CashRegisterClientProps {
  initialOpenRegister: any;
}

export default function CashRegisterClient({ initialOpenRegister }: CashRegisterClientProps) {
  const router = useRouter();
  const [openRegister] = useState(initialOpenRegister);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [transAmount, setTransAmount] = useState('');
  const [transDesc, setTransDesc] = useState('');
  const [transType, setTransType] = useState<'INCOME' | 'EXPENSE' | 'WITHDRAWAL'>('INCOME');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(amount);
  };

  const calculateExpected = () => {
    if (!openRegister) return 0;
    const start = Number(openRegister.openingBalance);
    const in_amt = openRegister.transactions
      .filter((t: any) => t.type === 'INCOME')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const out_amt = openRegister.transactions
      .filter((t: any) => t.type === 'EXPENSE' || t.type === 'WITHDRAWAL')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    return start + in_amt - out_amt;
  };

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await openCashRegister({
        name: `Caja Principal - ${new Date().toLocaleDateString()}`,
        openingBalance: parseFloat(openingBalance),
      });
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('¿Estás seguro de cerrar la caja?')) return;
    setLoading(true);
    setError(null);
    try {
      await closeCashRegister({
        cashRegisterId: openRegister.id,
        closingBalance: parseFloat(closingBalance),
      });
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await registerCashTransaction({
        cashRegisterId: openRegister.id,
        type: transType,
        amount: parseFloat(transAmount),
        description: transDesc,
      });
      setTransAmount('');
      setTransDesc('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Caja Registradora</h1>
          <p>Control de ingresos, egresos y arqueo de caja.</p>
        </div>
        <div className={`${styles.statusIndicator} ${openRegister ? styles.status_OPEN : styles.status_CLOSED}`}>
          {openRegister && <div className={styles.pulse} />}
          {openRegister ? 'CAJA ABIERTA' : 'CAJA CERRADA'}
        </div>
      </header>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {openRegister ? (
        <div className={styles.dashboardGrid}>
          <div className={styles.mainColumn}>
            <section className={styles.card}>
              <div className={styles.cardTitle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
                Balance de la Sesión
              </div>
              <div className={styles.balanceGrid}>
                <div className={styles.balanceItem}>
                  <span className={styles.balanceLabel}>Saldo Inicial</span>
                  <span className={styles.balanceValue}>{formatCurrency(Number(openRegister.openingBalance))}</span>
                </div>
                <div className={styles.balanceItem}>
                  <span className={styles.balanceLabel}>Ventas / Ingresos</span>
                  <span className={styles.balanceValue} style={{ color: '#16a34a' }}>
                    +{formatCurrency(openRegister.transactions.filter((t: any) => t.type === 'INCOME').reduce((s: number, t: any) => s + Number(t.amount), 0))}
                  </span>
                </div>
                <div className={styles.balanceItem}>
                  <span className={styles.balanceLabel}>Efectivo Estimado</span>
                  <span className={styles.balanceValue} style={{ color: 'var(--primary-color)' }}>{formatCurrency(calculateExpected())}</span>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardTitle}>Movimientos Recientes</div>
              <div className={styles.transactionsWrapper}>
                {openRegister.transactions.length > 0 ? (
                  <div className={styles.transactionList}>
                    {openRegister.transactions.map((t: any) => (
                      <div key={t.id} className={`${styles.transactionItem} ${styles[`type_${t.type}`]}`}>
                        <div className={styles.transInfo}>
                          <span className={styles.transDesc}>{t.description}</span>
                          <span className={styles.transDate}>
                            {new Date(t.createdAt).toLocaleTimeString()} {t.reference ? `• Ref: ${t.reference}` : ''}
                          </span>
                        </div>
                        <span className={`${styles.transAmount} ${t.type === 'INCOME' ? styles.amount_IN : styles.amount_OUT}`}>
                          {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>No hay movimientos registrados en esta sesión.</div>
                )}
              </div>
            </section>
          </div>

          <aside className={styles.mainColumn}>
            <section className={`${styles.card} ${styles.actionCard}`}>
              <div className={styles.cardTitle}>Nuevo Movimiento</div>
              <form onSubmit={handleTransaction}>
                <div className={styles.formGroup}>
                  <label>Monto</label>
                  <input type="number" step="0.01" required className={styles.input} value={transAmount} onChange={(e) => setTransAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className={styles.formGroup}>
                  <label>Descripción</label>
                  <input type="text" required className={styles.input} value={transDesc} onChange={(e) => setTransDesc(e.target.value)} placeholder="Ej. Pago servicio luz, Insumos..." />
                </div>
                <div className={styles.formGroup}>
                  <label>Tipo</label>
                  <select className={styles.select} value={transType} onChange={(e) => setTransType(e.target.value as any)}>
                    <option value="INCOME">Ingreso</option>
                    <option value="EXPENSE">Gasto (Egreso)</option>
                    <option value="WITHDRAWAL">Retiro de Efectivo</option>
                  </select>
                </div>
                <button type="submit" disabled={loading} className={`${styles.btn} ${styles.btnPrimary}`}>
                  {loading ? 'Registrando...' : 'Registrar'}
                </button>
              </form>
            </section>

            <section className={`${styles.card} ${styles.actionCard}`}>
              <div className={styles.cardTitle}>Cierre de Arqueo</div>
              <form onSubmit={handleClose}>
                <div className={styles.formGroup}>
                  <label>Saldo Final Real (Efectivo)</label>
                  <input type="number" step="0.01" required className={styles.input} value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} placeholder="0.00" />
                </div>
                <button type="submit" disabled={loading} className={`${styles.btn} ${styles.btnDanger}`}>
                  Cerrar Caja
                </button>
              </form>
            </section>
          </aside>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
          <div className={styles.card} style={{ width: '400px' }}>
            <div className={styles.cardTitle}>Abrir Nueva Sesión</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              Define el saldo inicial de efectivo para comenzar a recibir pagos.
            </p>
            <form onSubmit={handleOpen}>
              <div className={styles.formGroup}>
                <label>Saldo Inicial (Efectivo)</label>
                <input type="number" step="0.01" required className={styles.input} value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="0.00" />
              </div>
              <button type="submit" disabled={loading} className={`${styles.btn} ${styles.btnPrimary}`}>
                {loading ? 'Abriendo...' : 'Abrir Caja'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
