import React from 'react';
import styles from './Alert.module.css';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
  className?: string;
}

export function Alert({ variant = 'info', children, className = '', ...props }: AlertProps) {
  const variantClass = styles[variant] || styles['info'];
  const classes = `${styles['alert']} ${variantClass} ${className}`.trim();
  
  return (
    <div className={classes} role="alert" {...props}>
      {children}
    </div>
  );
}

export default Alert;
