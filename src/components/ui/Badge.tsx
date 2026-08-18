import React from 'react';
import styles from './Badge.module.css';

export interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'gray';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  const variantClass = `badge${variant.charAt(0).toUpperCase()}${variant.slice(1)}`;
  const classes = [
    styles['badge'],
    styles[variantClass],
    className
  ].filter(Boolean).join(' ');
  
  return <span className={classes}>{children}</span>;
}
