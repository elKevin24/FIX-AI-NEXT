import React from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  /** SVG icon element */
  icon?: React.ReactNode;
  /** Main heading */
  title: string;
  /** Descriptive text */
  description?: string;
  /** Optional action button or link */
  action?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`${styles['emptyState']} ${className}`} role="status">
      {icon && (
        <div className={styles['iconWrapper']}>
          {icon}
        </div>
      )}
      <h3 className={styles['title']}>{title}</h3>
      {description && (
        <p className={styles['description']}>{description}</p>
      )}
      {action && (
        <div className={styles['action']}>
          {action}
        </div>
      )}
    </div>
  );
}
