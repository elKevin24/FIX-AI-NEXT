import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'base' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  as?: any; // To support Link or other components
  href?: string; // For Link
  target?: string;
  rel?: string;
  [key: string]: any;
}

export function Button({
  variant = 'primary',
  size = 'base',
  fullWidth = false,
  isLoading = false,
  loading = false,
  leftIcon,
  rightIcon,
  className = '',
  children,
  disabled,
  as: Component = 'button',
  type,
  onClick,
  ...props
}: ButtonProps) {
  const isBusy = Boolean(isLoading || loading);
  const isDisabled = Boolean(disabled || isBusy);
  
  // Map variant strings to styles
  const variantStyle = styles[variant] || styles['primary'];
  
  // Map size strings to styles
  const sizeStyle = size === 'base' ? styles['baseSize'] : styles[size];
  
  const widthStyle = fullWidth ? styles['fullWidth'] : '';

  const classes = [
    styles['base'],
    variantStyle,
    sizeStyle,
    widthStyle,
    isDisabled ? styles['disabled'] : '',
    className
  ].filter(Boolean).join(' ');

  const isNativeButton = Component === 'button';
  const buttonType = isNativeButton ? (type || 'button') : undefined;

  return (
    <Component 
      className={classes} 
      type={buttonType}
      disabled={isNativeButton ? isDisabled : undefined}
      aria-disabled={!isNativeButton && isDisabled ? 'true' : undefined}
      tabIndex={!isNativeButton && isDisabled ? -1 : props.tabIndex}
      aria-busy={isBusy ? 'true' : undefined}
      onClick={onClick}
      {...props}
    >
      {isBusy && <span className={styles['spinner']} aria-hidden="true" />}
      {!isBusy && leftIcon && <span className={styles['iconLeft']} aria-hidden="true">{leftIcon}</span>}
      {children}
      {!isBusy && rightIcon && <span className={styles['iconRight']} aria-hidden="true">{rightIcon}</span>}
    </Component>
  );
}
