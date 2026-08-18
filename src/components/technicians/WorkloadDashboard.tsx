'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui';
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

  const fetchWorkload = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/technicians/workload');
      if (!res.ok) throw new Error('Failed to fetch workload data');
      const workloadData = await res.json();
      setData(workloadData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch('/api/technicians/workload')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch workload data');
        return res.json();
      })
      .then((workloadData) => {
        if (!ignore) {
          setData(workloadData);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'An error occurred');
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return (
      <div className={styles['container']}>
        <div className={styles['loading']} role="status" aria-live="polite">
          <div className={styles['spinner']} aria-hidden="true"></div>
          <p>Loading workload data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles['container']}>
        <div className={styles['error']} role="alert">
          <p>Error: {error}</p>
          <Button type="button" variant="danger" onClick={fetchWorkload}>
            Retry
          </Button>
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
    <div className={styles['container']}>
      <header className={styles['header']}>
        <div>
          <h1>Technician Workload</h1>
          <p>Monitor and manage technician capacity and assignments</p>
        </div>
        <Button type="button" variant="secondary" onClick={fetchWorkload}>
          🔄 Refresh
        </Button>
      </header>

      <WorkloadSummary summary={data.summary} />

      <div className={styles['controls']}>
        <div className={styles['filterGroup']}>
          <label htmlFor="workload-status-filter">Filter:</label>
          <select
            id="workload-status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles['select']}
            aria-label="Filter technicians by availability"
          >
            <option value="all">All Technicians</option>
            <option value="available">Available Only</option>
            <option value="full">Fully Booked</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>

        <div className={styles['filterGroup']}>
          <label htmlFor="workload-sort">Sort by:</label>
          <select
            id="workload-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className={styles['select']}
            aria-label="Sort technicians"
          >
            <option value="utilization">Utilization</option>
            <option value="workload">Workload</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <div className={styles['techniciansGrid']}>
        {filteredTechnicians.length === 0 ? (
          <div className={styles['emptyState']}>
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
