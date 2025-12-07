'use client';

import React, { useId } from 'react';

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

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`form-select ${className}`}
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
      {error && (
        <span className="form-helper form-error">{error}</span>
      )}
      {!error && helper && (
        <span className="form-helper">{helper}</span>
      )}
    </div>
  );
}
