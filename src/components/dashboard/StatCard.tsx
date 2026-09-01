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
}

export function StatCard({ title, value, label, icon, iconBgColor = '#dbeafe', iconColor = '#1e40af' }: StatCardProps) {
  return (
    <Card className={styles['card']}>
      <CardBody className={styles['body']}>
        <div 
          className={styles['iconWrapper']}
          style={{ backgroundColor: iconBgColor, color: iconColor }}
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
