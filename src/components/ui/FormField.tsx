import React from 'react';
import styles from './Form.module.css';

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  helperText,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`${styles['formGroup']} ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className={styles['label']}>
          {label}
          {required && <span className={styles['requiredAsterisk']} aria-hidden="true"> *</span>}
        </label>
      )}
      {children}
      {error && (
        <p className={styles['fieldError']} role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className={styles['helperText']}>
          {helperText}
        </p>
      )}
    </div>
  );
}

export default FormField;
