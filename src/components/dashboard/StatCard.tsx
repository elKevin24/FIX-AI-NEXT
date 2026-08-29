import React from 'react';
import styles from './StatCard.module.css';

type StatVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

interface StatCardProps {
  title: string;
  value: number | string;
  label: string;
  footerText?: string;
  icon: React.ReactNode;
  variant?: StatVariant;
  iconBgColor?: string;
  iconColor?: string;
}

export function StatCard({ 
  title, 
  value, 
  label, 
  footerText, 
  icon, 
  variant = 'default',
  iconBgColor,
  iconColor
}: StatCardProps) {
  
  return (
    <div className={`${styles['statCard']} ${styles[variant]}`}>
      <div className={styles['body']}>
        
        <div className={styles['header']}>
          <h2 className={styles['title']}>{title}</h2>
          <div 
            className={styles['iconWrapper']} 
            style={iconBgColor || iconColor ? { backgroundColor: iconBgColor, color: iconColor } : undefined}
          >
            {icon}
          </div>
        </div>
        
        <div className={`${styles['value']} metric-tabular`}>
          {value}
        </div>
        
        <div className={styles['label']}>
          {label}
        </div>
        
        {footerText && (
          <div className={styles['footer']}>
            {footerText}
          </div>
        )}
        
      </div>
    </div>
  );
}
