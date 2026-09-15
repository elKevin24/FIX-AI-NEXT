import React from 'react';
import styles from './Badge.module.css';

export interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'gray';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  const classes = [
    styles.base,
    styles[variant],
    className
  ].filter(Boolean).join(' ');
  
  return <span className={classes}>{children}</span>;
}
