import React from 'react';
import styles from './FilterGroup.module.css';

interface FilterGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * FilterGroup Component
 * Applies Miller's Law (7 ± 2 items) by encouraging cognitive grouping 
 * of complex forms and search filters into small, digestible chunks (3-5 items).
 */
export function FilterGroup({ title, description, children, className = '' }: FilterGroupProps) {
  const classes = [styles.filterGroup, className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
