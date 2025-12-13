'use client';

import React, { useId } from 'react';
import styles from './Form.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  helper,
  options,
  placeholder,
  className = '',
  id,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;
  const hasError = !!error;

  const selectClasses = [
    styles.select,
    hasError ? styles.errorInput : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.group}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.selectWrapper}>
        <select
          id={selectId}
          className={selectClasses}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : helper ? helperId : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
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
