'use client';

import React, { useId } from 'react';
import styles from './Form.module.css';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export function Textarea({
  label,
  error,
  helper,
  className = '',
  id,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id || generatedId;
  const helperId = `${textareaId}-helper`;
  const errorId = `${textareaId}-error`;
  const hasError = !!error;

  const textareaClasses = [
    styles.textarea,
    hasError ? styles.errorInput : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.group}>
      {label && (
        <label htmlFor={textareaId} className={styles.label}>
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={textareaClasses}
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
