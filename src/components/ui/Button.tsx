import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'base' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  as?: any; // To support Link or other components
  href?: string; // For Link
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
  as: Component = 'button',
  ...props
}: ButtonProps) {
  
  // Map variant strings to styles
  const variantStyle = styles[variant] || styles.primary;
  
  // Map size strings to styles
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
    <Component 
      className={classes} 
      disabled={disabled || isLoading} 
      {...props}
    >
      {isLoading && <span className={styles.spinner} aria-hidden="true" />}
      {!isLoading && leftIcon && <span className={styles.iconLeft}>{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className={styles.iconRight}>{rightIcon}</span>}
    </Component>
  );
}
