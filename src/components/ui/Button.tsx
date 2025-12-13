import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'base' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'base',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  
  // Map variant strings to styles
  const variantStyle = styles[variant] || styles.primary;
  
  // Map size strings to styles (handle 'base' specially if needed, but CSS map is cleaner)
  const sizeStyle = size === 'base' ? styles.baseSize : styles[size];
  
  const widthStyle = fullWidth ? styles.fullWidth : '';

  const classes = [
    styles.base,
    variantStyle,
    sizeStyle,
    widthStyle,
    className
  ].filter(Boolean).join(' ');

  return (
    <button 
      className={classes} 
      disabled={disabled || isLoading} 
      {...props}
    >
      {isLoading && <span className={styles.spinner} aria-hidden="true" />}
      {!isLoading && leftIcon && <span className="inline-flex mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="inline-flex ml-2">{rightIcon}</span>}
    </button>
  );
}
