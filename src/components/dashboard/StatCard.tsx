import React from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import styles from './StatCard.module.css';

interface StatCardProps {
  title: string;
  value: number | string;
  label: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  label, 
  icon, 
  iconBgColor, 
  iconColor,
  className = ''
}: StatCardProps) {
  const customIconStyle = (iconBgColor || iconColor) ? {
    backgroundColor: iconBgColor,
    color: iconColor,
  } : undefined;

  return (
    <Card className={`${styles['statCard']} ${className}`}>
      <CardBody className={styles['body']}>
        <div 
          className={styles['iconWrapper']}
          style={customIconStyle}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className={styles['content']}>
          <h3 className={styles['title']}>{title}</h3>
          <p className={styles['value']}>{value}</p>
          <p className={styles['label']}>{label}</p>
        </div>
      </CardBody>
    </Card>
  );
}

