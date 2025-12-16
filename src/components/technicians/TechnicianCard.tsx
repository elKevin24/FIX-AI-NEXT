'use client';

import { useState } from 'react';
import styles from './TechnicianCard.module.css';

interface Technician {
  id: string;
  name: string | null;
  email: string;
  status: string;
  statusReason: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  specializations: string[];
  maxConcurrentTickets: number;
  currentWorkload: number;
  availableSlots: number;
  utilizationPercent: number;
  isAvailable: boolean;
  isFull: boolean;
  ticketsByStatus: {
    OPEN: number;
    IN_PROGRESS: number;
    WAITING_FOR_PARTS: number;
  };
  ticketsByPriority: {
    URGENT: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  tickets: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    customer: {
      id: string;
      name: string;
    };
  }>;
}

interface TechnicianCardProps {
  technician: Technician;
  onRefresh: () => void;
}

export function TechnicianCard({ technician, onRefresh }: TechnicianCardProps) {
  const [showTickets, setShowTickets] = useState(false);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return styles.statusAvailable;
      case 'ON_VACATION':
        return styles.statusVacation;
      case 'ON_LEAVE':
        return styles.statusLeave;
      case 'IN_TRAINING':
        return styles.statusTraining;
      case 'SICK_LEAVE':
        return styles.statusSick;
      default:
        return styles.statusUnavailable;
    }
  };

  const getUtilizationClass = () => {
    if (technician.utilizationPercent >= 86) return styles.utilizationHigh;
    if (technician.utilizationPercent >= 61) return styles.utilizationMedium;
    return styles.utilizationLow;
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.technicianInfo}>
          <div className={styles.avatar}>
            {(technician.name || technician.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className={styles.name}>{technician.name || technician.email}</h3>
            <p className={styles.email}>{technician.email}</p>
          </div>
        </div>
        <span className={`${styles.statusBadge} ${getStatusBadgeClass(technician.status)}`}>
          {formatStatus(technician.status)}
        </span>
      </div>

      {technician.status !== 'AVAILABLE' && technician.statusReason && (
        <div className={styles.statusReason}>
          <span className={styles.reasonIcon}>ℹ️</span>
          <span>{technician.statusReason}</span>
          {technician.availableFrom && (
            <span className={styles.returnDate}>
              Returns: {formatDate(technician.availableFrom)}
            </span>
          )}
        </div>
      )}

      <div className={styles.workload}>
        <div className={styles.workloadHeader}>
          <span className={styles.workloadLabel}>Workload</span>
          <span className={styles.workloadValue}>
            {technician.currentWorkload} / {technician.maxConcurrentTickets}
          </span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={`${styles.progressFill} ${getUtilizationClass()}`}
            style={{ width: `${technician.utilizationPercent}%` }}
          />
        </div>
        <div className={styles.workloadFooter}>
          <span className={styles.utilizationText}>
            {technician.utilizationPercent}% utilized
          </span>
          <span className={styles.slotsText}>
            {technician.availableSlots} slot{technician.availableSlots !== 1 ? 's' : ''} available
          </span>
        </div>
      </div>

      {technician.specializations.length > 0 && (
        <div className={styles.specializations}>
          <span className={styles.specializationsLabel}>Specializations:</span>
          <div className={styles.specializationTags}>
            {technician.specializations.map((spec) => (
              <span key={spec} className={styles.specializationTag}>
                {spec.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.ticketBreakdown}>
        <h4 className={styles.breakdownTitle}>Tickets by Status</h4>
        <div className={styles.breakdownGrid}>
          {technician.ticketsByStatus.OPEN > 0 && (
            <div className={styles.breakdownItem}>
              <span className={`${styles.breakdownBadge} ${styles.badgeOpen}`}>OPEN</span>
              <span className={styles.breakdownCount}>{technician.ticketsByStatus.OPEN}</span>
            </div>
          )}
          {technician.ticketsByStatus.IN_PROGRESS > 0 && (
            <div className={styles.breakdownItem}>
              <span className={`${styles.breakdownBadge} ${styles.badgeInProgress}`}>IN PROGRESS</span>
              <span className={styles.breakdownCount}>{technician.ticketsByStatus.IN_PROGRESS}</span>
            </div>
          )}
          {technician.ticketsByStatus.WAITING_FOR_PARTS > 0 && (
            <div className={styles.breakdownItem}>
              <span className={`${styles.breakdownBadge} ${styles.badgeWaiting}`}>WAITING</span>
              <span className={styles.breakdownCount}>{technician.ticketsByStatus.WAITING_FOR_PARTS}</span>
            </div>
          )}
        </div>

        {(technician.ticketsByPriority.URGENT > 0 || technician.ticketsByPriority.HIGH > 0) && (
          <div className={styles.priorityAlert}>
            {technician.ticketsByPriority.URGENT > 0 && (
              <span className={styles.priorityUrgent}>
                🔴 {technician.ticketsByPriority.URGENT} urgent
              </span>
            )}
            {technician.ticketsByPriority.HIGH > 0 && (
              <span className={styles.priorityHigh}>
                🟡 {technician.ticketsByPriority.HIGH} high
              </span>
            )}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button
          onClick={() => setShowTickets(!showTickets)}
          className={styles.actionButton}
        >
          {showTickets ? '▲ Hide Tickets' : `▼ View Tickets (${technician.tickets.length})`}
        </button>
      </div>

      {showTickets && technician.tickets.length > 0 && (
        <div className={styles.ticketsList}>
          {technician.tickets.map((ticket) => (
            <a
              key={ticket.id}
              href={`/dashboard/tickets/${ticket.id}`}
              className={styles.ticketItem}
            >
              <div className={styles.ticketHeader}>
                <span className={styles.ticketId}>#{ticket.id.slice(0, 8)}</span>
                <span className={`${styles.ticketPriority} ${styles[`priority${ticket.priority}`]}`}>
                  {ticket.priority}
                </span>
              </div>
              <div className={styles.ticketTitle}>{ticket.title}</div>
              <div className={styles.ticketCustomer}>{ticket.customer.name}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
