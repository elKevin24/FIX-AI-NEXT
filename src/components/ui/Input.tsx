'use client';

import React, { useId } from 'react';
import styles from './Form.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export function Input({
  label,
  error,
  helper,
  className = '',
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const hasError = !!error;

  const inputClasses = [
    styles.input,
    hasError ? styles.errorInput : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.group}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={inputClasses}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : helper ? helperId : undefined}
        {...props}
      />
      {hasError && (
        <span id={errorId} className={`${styles.helper} ${styles.errorMessage}`}>
          {error}
        </span>
      )}
      {!hasError && helper && (
        <span id={helperId} className={styles.helper}>
          {helper}
        </span>
      )}
    </div>
  );
}
