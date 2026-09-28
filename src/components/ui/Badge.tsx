import React from 'react';
import styles from './Badge.module.css';

export interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'gray';
  size?: 'sm' | 'base' | 'lg';
  hasDot?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ 
  variant = 'gray', 
  size = 'base',
  hasDot = false,
  children, 
  className = '' 
}: BadgeProps) {
  const variantClass = `badge${variant.charAt(0).toUpperCase()}${variant.slice(1)}`;
  const sizeClass = size === 'sm' ? styles['badgeSmall'] : size === 'lg' ? styles['badgeLarge'] : '';
  const dotClass = hasDot ? styles['badgeDot'] : '';

  const classes = [
    styles['badge'],
    styles[variantClass],
    sizeClass,
    dotClass,
    className
  ].filter(Boolean).join(' ');
  
  return <span className={classes}>{children}</span>;
}
