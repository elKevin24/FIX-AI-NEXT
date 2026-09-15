'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { getTemplateAnalytics, TemplateAnalytics } from '@/lib/service-template-actions';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts';
import styles from './analytics.module.css';

interface Props {
  initialData: TemplateAnalytics;
}

const CATEGORY_LABELS: Record<string, string> = {
  MAINTENANCE: 'Mantenimiento',
  REPAIR: 'Reparación',
  UPGRADE: 'Mejora',
  DIAGNOSTIC: 'Diagnóstico',
  INSTALLATION: 'Instalación',
  CONSULTATION: 'Consulta',
};

const CATEGORY_COLORS: Record<string, string> = {
  MAINTENANCE: '#10B981',
  REPAIR: '#EF4444',
  UPGRADE: '#6366F1',
  DIAGNOSTIC: '#64748B',
  INSTALLATION: '#0EA5E9',
  CONSULTATION: '#F59E0B',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En Progreso',
  WAITING_FOR_PARTS: 'Esperando Repuestos',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
};

export default function TemplateAnalyticsClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  const handleUpdate = () => {
    startTransition(async () => {
      const newData = await getTemplateAnalytics(new Date(startDate), new Date(endDate));
      setData(newData);
    });
  };

  const formatCurrency = (val: number) =>
    `Q${Number(val).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const formatMonthLabel = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('es-GT', { month: 'short', year: '2-digit' });
  };

  // Prepare chart data
  const categoryChartData = data.categoryBreakdown.map((c) => ({
    name: CATEGORY_LABELS[c.category] || c.category,
    tickets: c.ticketCount,
    revenue: c.revenue,
    fill: CATEGORY_COLORS[c.category] || '#3B82F6',
  }));

  const trendChartData = data.monthlyTrend.map((m) => ({
    ...m,
    label: formatMonthLabel(m.month),
  }));

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/dashboard/settings/service-templates" className={styles.backLink}>
            ← Volver a Plantillas
          </Link>
          <h1>Analytics de Plantillas</h1>
          <p className={styles.subtitle}>
            Métricas y estadísticas de uso de tus plantillas de servicio
          </p>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Desde</label>
            <input
              type="date"
              className={styles.input}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Hasta</label>
            <input
              type="date"
              className={styles.input}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button
            className={styles.updateButton}
            onClick={handleUpdate}
            disabled={isPending}
          >
            {isPending ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>📋</span>
          <div className={styles.summaryContent}>
            <span className={styles.summaryLabel}>Total Plantillas</span>
            <span className={styles.summaryValue}>{data.summary.totalTemplates}</span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>✅</span>
          <div className={styles.summaryContent}>
            <span className={styles.summaryLabel}>Plantillas Activas</span>
            <span className={styles.summaryValue}>{data.summary.activeTemplates}</span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>🎫</span>
          <div className={styles.summaryContent}>
            <span className={styles.summaryLabel}>Tickets Creados</span>
            <span className={styles.summaryValue}>{data.summary.totalTicketsCreated}</span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>💰</span>
          <div className={styles.summaryContent}>
            <span className={styles.summaryLabel}>Ingresos (Mano de Obra)</span>
            <span className={`${styles.summaryValue} ${styles.revenue}`}>
              {formatCurrency(data.summary.totalRevenueFromTemplates)}
            </span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className={styles.chartsGrid}>
        {/* Category Breakdown */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Tickets por Categoría</h2>
          <div className={styles.chartContainer}>
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="tickets"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      if (name === 'tickets') return [value, 'Tickets'];
                      return [formatCurrency(Number(value)), 'Ingresos'];
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.emptyChart}>
                <span>Sin datos en este período</span>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Tendencia Mensual</h2>
          <div className={styles.chartContainer}>
            {trendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      if (name === 'ticketCount') return [value, 'Tickets'];
                      return [formatCurrency(Number(value)), 'Ingresos'];
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="ticketCount"
                    name="Tickets"
                    stroke="var(--color-primary-500)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    name="Ingresos"
                    stroke="var(--color-success-500)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.emptyChart}>
                <span>Sin datos en este período</span>
              </div>
            )}
          </div>
        </div>

        {/* Revenue by Category */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Ingresos por Categoría</h2>
          <div className={styles.chartContainer}>
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `Q${v}`} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="revenue" name="Ingresos" radius={[0, 4, 4, 0]}>
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.emptyChart}>
                <span>Sin datos en este período</span>
              </div>
            )}
          </div>
        </div>

        {/* Top Templates Table */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Plantillas Más Usadas</h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Plantilla</th>
                  <th style={{ textAlign: 'center' }}>Tickets</th>
                  <th style={{ textAlign: 'right' }}>Ingresos</th>
                  <th style={{ textAlign: 'right' }}>Último Uso</th>
                </tr>
              </thead>
              <tbody>
                {data.templateUsage.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.emptyRow}>
                      Sin datos en este período
                    </td>
                  </tr>
                ) : (
                  data.templateUsage.slice(0, 10).map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className={styles.templateCell}>
                          <span
                            className={styles.templateIcon}
                            style={{ backgroundColor: t.color || '#3B82F6' }}
                          >
                            {t.icon || '📋'}
                          </span>
                          <div>
                            <strong>{t.name}</strong>
                            <span className={styles.categoryBadge}>
                              {CATEGORY_LABELS[t.category] || t.category}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={styles.ticketBadge}>{t.ticketCount}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{formatCurrency(t.totalRevenue)}</strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {t.lastUsed ? formatDate(t.lastUsed) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className={styles.card} style={{ marginTop: '1.5rem' }}>
        <h2 className={styles.cardTitle}>Actividad Reciente</h2>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Plantilla</th>
                <th>Cliente</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
                <th style={{ textAlign: 'right' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {data.recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    No hay actividad reciente
                  </td>
                </tr>
              ) : (
                data.recentActivity.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/dashboard/tickets/${a.id}`} className={styles.ticketLink}>
                        <strong>{a.ticketNumber || a.id.slice(0, 8)}</strong>
                        <span className={styles.ticketTitle}>{a.title}</span>
                      </Link>
                    </td>
                    <td>
                      <span className={styles.templateName}>
                        {a.templateIcon} {a.templateName}
                      </span>
                    </td>
                    <td>{a.customerName}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`${styles.statusBadge} ${styles[`status${a.status}`]}`}>
                        {STATUS_LABELS[a.status] || a.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatDate(a.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
