'use client';

import styles from './WorkloadSummary.module.css';
import Link from 'next/link';

interface WorkloadSummaryProps {
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

export function WorkloadSummary({ summary }: WorkloadSummaryProps) {
  const utilizationClass =
    summary.overallUtilization >= 86 ? styles.utilizationHigh :
    summary.overallUtilization >= 61 ? styles.utilizationMedium :
    styles.utilizationLow;

  return (
    <div className={styles.summary}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>👥</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{summary.totalTechnicians}</div>
            <div className={styles.statLabel}>Total Technicians</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGreen}`}>✅</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{summary.availableTechnicians}</div>
            <div className={styles.statLabel}>Available</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconRed}`}>🔴</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{summary.fullyBookedTechnicians}</div>
            <div className={styles.statLabel}>Fully Booked</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGray}`}>⏸️</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{summary.unavailableTechnicians}</div>
            <div className={styles.statLabel}>Unavailable</div>
          </div>
        </div>
      </div>

      <div className={styles.capacitySection}>
        <div className={styles.capacityHeader}>
          <h3>Overall Capacity</h3>
          <div className={styles.capacityStats}>
            <span className={styles.capacityStat}>
              {summary.totalAssigned} / {summary.totalCapacity} tickets
            </span>
            <span className={styles.capacityStat}>
              {summary.totalAvailableSlots} slots available
            </span>
          </div>
        </div>

        <div className={styles.progressBarContainer}>
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill} ${utilizationClass}`}
              style={{ width: `${summary.overallUtilization}%` }}
            >
              <span className={styles.progressText}>
                {summary.overallUtilization}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {(summary.unassignedTickets > 0 || summary.unassignedOldTickets > 0) && (
        <div className={styles.alertSection}>
          <div className={styles.alert}>
            <div className={styles.alertIcon}>📋</div>
            <div className={styles.alertContent}>
              <strong>{summary.unassignedTickets} unassigned tickets</strong>
              {summary.unassignedOldTickets > 0 && (
                <span className={styles.alertWarning}>
                  ⚠️ {summary.unassignedOldTickets} older than 48 hours
                </span>
              )}
            </div>
            <Link href="/dashboard/tickets/pool" className={styles.alertButton}>
              View Pool
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
