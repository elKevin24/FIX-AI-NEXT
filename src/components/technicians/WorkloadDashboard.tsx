'use client';

import { useEffect, useState } from 'react';
import styles from './WorkloadDashboard.module.css';
import { TechnicianCard } from './TechnicianCard';
import { WorkloadSummary } from './WorkloadSummary';

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

interface WorkloadData {
  technicians: Technician[];
  summary: {
    totalTechnicians: number;
    availableTechnicians: number;
    fullyBookedTechnicians: number;
    unavailableTechnicians: number;
    totalCapacity: number;
    totalAssigned: number;
    totalAvailableSlots: number;
    overallUtilization: number;
    unassignedTickets: number;
    unassignedOldTickets: number;
  };
}

export function WorkloadDashboard() {
  const [data, setData] = useState<WorkloadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'workload' | 'utilization'>('utilization');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchWorkload();
  }, []);

  const fetchWorkload = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/technicians/workload');

      if (!response.ok) {
        throw new Error('Failed to fetch workload data');
      }

      const workloadData = await response.json();
      setData(workloadData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading workload data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Error: {error}</p>
          <button onClick={fetchWorkload} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Filter technicians
  let filteredTechnicians = [...data.technicians];
  if (filterStatus !== 'all') {
    if (filterStatus === 'available') {
      filteredTechnicians = filteredTechnicians.filter(t => t.isAvailable);
    } else if (filterStatus === 'full') {
      filteredTechnicians = filteredTechnicians.filter(t => t.isFull);
    } else if (filterStatus === 'unavailable') {
      filteredTechnicians = filteredTechnicians.filter(t => t.status !== 'AVAILABLE');
    }
  }

  // Sort technicians
  filteredTechnicians.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.name || a.email).localeCompare(b.name || b.email);
      case 'workload':
        return b.currentWorkload - a.currentWorkload;
      case 'utilization':
        return b.utilizationPercent - a.utilizationPercent;
      default:
        return 0;
    }
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Technician Workload</h1>
          <p>Monitor and manage technician capacity and assignments</p>
        </div>
        <button onClick={fetchWorkload} className={styles.refreshButton}>
          🔄 Refresh
        </button>
      </header>

      <WorkloadSummary summary={data.summary} />

      <div className={styles.controls}>
        <div className={styles.filterGroup}>
          <label>Filter:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.select}
          >
            <option value="all">All Technicians</option>
            <option value="available">Available Only</option>
            <option value="full">Fully Booked</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className={styles.select}
          >
            <option value="utilization">Utilization</option>
            <option value="workload">Workload</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <div className={styles.techniciansGrid}>
        {filteredTechnicians.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No technicians found with the selected filters.</p>
          </div>
        ) : (
          filteredTechnicians.map((technician) => (
            <TechnicianCard
              key={technician.id}
              technician={technician}
              onRefresh={fetchWorkload}
            />
          ))
        )}
      </div>
    </div>
  );
}
