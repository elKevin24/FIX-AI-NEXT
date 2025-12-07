import React from 'react';

export interface AlertProps {
  variant?: 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
  className?: string;
}

export function Alert({ variant = 'info', children, className = '' }: AlertProps) {
  const classes = `alert alert-${variant} ${className}`;
  return <div className={classes} role="alert">{children}</div>;
}
