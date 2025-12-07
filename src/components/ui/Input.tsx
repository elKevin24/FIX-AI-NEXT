'use client';

import React, { useId } from 'react';

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
  const hasError = !!error;

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`form-input ${className}`}
        {...props}
      />
      {error && (
        <span className="form-helper form-error">{error}</span>
      )}
      {!error && helper && (
        <span className="form-helper">{helper}</span>
      )}
    </div>
  );
}
