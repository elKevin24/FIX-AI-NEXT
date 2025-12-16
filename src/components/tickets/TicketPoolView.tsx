'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Session } from 'next-auth';
import styles from './TicketPoolView.module.css';

interface Customer {
  id: string;
  name: string;
}

interface PoolTicket {
  id: string;
  title: string;
  description: string;
  priority: string;
  createdAt: string;
  deviceType: string | null;
  deviceModel: string | null;
  customer: Customer;
  ageInHours: number;
  isOld: boolean;
  isVeryOld: boolean;
  matchesSpecializations: boolean;
}

interface WorkloadInfo {
  currentWorkload: number;
  maxConcurrentTickets: number;
  availableSlots: number;
  utilizationPercent: number;
  isAvailable: boolean;
  status: string;
}

interface TicketPoolViewProps {
  session: Session;
}

export function TicketPoolView({ session }: TicketPoolViewProps) {
  const [tickets, setTickets] = useState<PoolTicket[]>([]);
  const [workload, setWorkload] = useState<WorkloadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [takingTicket, setTakingTicket] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch pool tickets
      const poolRes = await fetch('/api/tickets/pool');
      if (!poolRes.ok) throw new Error('Failed to fetch pool tickets');
      const poolData = await poolRes.json();

      // Fetch user's current workload
      if (session?.user?.id) {
        const workloadRes = await fetch(`/api/technicians/${session.user.id}/availability`);
        if (workloadRes.ok) {
          const workloadData = await workloadRes.json();
          setWorkload(workloadData);
        }
      }

      setTickets(poolData.tickets || []);
    } catch (error) {
      console.error('Error fetching pool data:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleTakeTicket = async (ticketId: string) => {
    if (!confirm('¿Deseas asignar este ticket a ti mismo?')) return;

    setTakingTicket(ticketId);

    try {
      const res = await fetch(`/api/tickets/${ticketId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'take' }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Error al asignar el ticket');
        return;
      }

      // Success - refresh the pool
      await fetchData();
      alert('Ticket asignado exitosamente');
    } catch (error) {
      console.error('Error taking ticket:', error);
      alert('Error al asignar el ticket');
    } finally {
      setTakingTicket(null);
    }
  };

  // Filter tickets
  let filteredTickets = tickets;

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredTickets = filteredTickets.filter(
      (ticket) =>
        ticket.title.toLowerCase().includes(query) ||
        ticket.customer.name.toLowerCase().includes(query) ||
        ticket.id.toLowerCase().includes(query)
    );
  }

  if (priorityFilter !== 'all') {
    filteredTickets = filteredTickets.filter(
      (ticket) => ticket.priority === priorityFilter
    );
  }

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return styles.priorityUrgent;
      case 'HIGH':
        return styles.priorityHigh;
      case 'MEDIUM':
        return styles.priorityMedium;
      case 'LOW':
        return styles.priorityLow;
      default:
        return styles.priorityMedium;
    }
  };

  const getAgeLabel = (ticket: PoolTicket) => {
    if (ticket.isVeryOld) return '⚠️ +48h';
    if (ticket.isOld) return '⏰ +24h';
    if (ticket.ageInHours < 1) return '🆕 Nuevo';
    return `${ticket.ageInHours}h`;
  };

  if (loading && tickets.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Cargando pool de tickets...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Pool de Tickets Disponibles</h1>
          <p className={styles.subtitle}>
            Tickets sin asignar ordenados por prioridad
          </p>
        </div>
        <button onClick={fetchData} className={styles.refreshButton}>
          🔄 Actualizar
        </button>
      </header>

      {/* Workload Info */}
      {workload && (
        <div className={styles.workloadCard}>
          <div className={styles.workloadHeader}>
            <h3 className={styles.workloadTitle}>Tu Capacidad</h3>
            <span className={`${styles.statusBadge} ${styles['status' + workload.status]}`}>
              {workload.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className={styles.workloadStats}>
            <div className={styles.workloadStat}>
              <span className={styles.workloadLabel}>Tickets Activos</span>
              <span className={styles.workloadValue}>
                {workload.currentWorkload} / {workload.maxConcurrentTickets}
              </span>
            </div>
            <div className={styles.workloadStat}>
              <span className={styles.workloadLabel}>Slots Disponibles</span>
              <span className={styles.workloadValue}>{workload.availableSlots}</span>
            </div>
            <div className={styles.workloadStat}>
              <span className={styles.workloadLabel}>Utilización</span>
              <span className={styles.workloadValue}>{workload.utilizationPercent}%</span>
            </div>
          </div>
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill} ${
                workload.utilizationPercent <= 60
                  ? styles.utilizationLow
                  : workload.utilizationPercent <= 85
                  ? styles.utilizationMedium
                  : styles.utilizationHigh
              }`}
              style={{ width: `${workload.utilizationPercent}%` }}
            />
          </div>
          {!workload.isAvailable && (
            <div className={styles.warningMessage}>
              ⚠️ No puedes tomar más tickets. {workload.status !== 'AVAILABLE' ? 'Estado: ' + workload.status : 'Capacidad completa'}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Buscar por cliente, título o ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.priorityFilters}>
          <button
            onClick={() => setPriorityFilter('all')}
            className={`${styles.filterButton} ${priorityFilter === 'all' ? styles.filterButtonActive : ''}`}
          >
            Todos ({tickets.length})
          </button>
          <button
            onClick={() => setPriorityFilter('URGENT')}
            className={`${styles.filterButton} ${styles.filterUrgent} ${priorityFilter === 'URGENT' ? styles.filterButtonActive : ''}`}
          >
            Urgente ({tickets.filter(t => t.priority === 'URGENT').length})
          </button>
          <button
            onClick={() => setPriorityFilter('HIGH')}
            className={`${styles.filterButton} ${styles.filterHigh} ${priorityFilter === 'HIGH' ? styles.filterButtonActive : ''}`}
          >
            Alto ({tickets.filter(t => t.priority === 'HIGH').length})
          </button>
          <button
            onClick={() => setPriorityFilter('MEDIUM')}
            className={`${styles.filterButton} ${styles.filterMedium} ${priorityFilter === 'MEDIUM' ? styles.filterButtonActive : ''}`}
          >
            Medio ({tickets.filter(t => t.priority === 'MEDIUM').length})
          </button>
          <button
            onClick={() => setPriorityFilter('LOW')}
            className={`${styles.filterButton} ${styles.filterLow} ${priorityFilter === 'LOW' ? styles.filterButtonActive : ''}`}
          >
            Bajo ({tickets.filter(t => t.priority === 'LOW').length})
          </button>
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <h2 className={styles.emptyTitle}>No hay tickets disponibles</h2>
          <p className={styles.emptyText}>
            {searchQuery || priorityFilter !== 'all'
              ? 'No hay tickets que coincidan con los filtros seleccionados.'
              : 'Todos los tickets están asignados. ¡Buen trabajo!'}
          </p>
        </div>
      ) : (
        <div className={styles.ticketsList}>
          {filteredTickets.map((ticket) => (
            <div key={ticket.id} className={styles.ticketCard}>
              <div className={styles.ticketHeader}>
                <div className={styles.ticketMeta}>
                  <span className={`${styles.priorityBadge} ${getPriorityStyle(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                  <span className={styles.ticketId}>#{ticket.id.slice(0, 8)}</span>
                  <span className={`${styles.ageBadge} ${ticket.isVeryOld ? styles.ageVeryOld : ticket.isOld ? styles.ageOld : ''}`}>
                    {getAgeLabel(ticket)}
                  </span>
                  {ticket.matchesSpecializations && (
                    <span className={styles.matchBadge}>✨ Coincide con tus especialidades</span>
                  )}
                </div>
              </div>

              <div className={styles.ticketBody}>
                <h3 className={styles.ticketTitle}>{ticket.title}</h3>
                <p className={styles.ticketDescription}>{ticket.description}</p>

                <div className={styles.ticketDetails}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Cliente:</span>
                    <span className={styles.detailValue}>{ticket.customer.name}</span>
                  </div>
                  {ticket.deviceType && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Dispositivo:</span>
                      <span className={styles.detailValue}>
                        {ticket.deviceType} {ticket.deviceModel && `- ${ticket.deviceModel}`}
                      </span>
                    </div>
                  )}
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Creado:</span>
                    <span className={styles.detailValue}>
                      {new Date(ticket.createdAt).toLocaleString('es-ES')}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.ticketActions}>
                <a
                  href={`/dashboard/tickets/${ticket.id}`}
                  className={styles.viewButton}
                >
                  👁️ Ver Detalles
                </a>
                <button
                  onClick={() => handleTakeTicket(ticket.id)}
                  disabled={!workload?.isAvailable || takingTicket === ticket.id}
                  className={styles.takeButton}
                >
                  {takingTicket === ticket.id ? '⏳ Asignando...' : '✋ Tomar Ticket'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
