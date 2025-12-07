'use client';

import React, { useId } from 'react';

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

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={textareaId} className="form-label">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`form-textarea ${className}`}
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
