'use client';

import React, { useId, useState, useRef, useEffect } from 'react';
import formStyles from './Form.module.css';
import selectStyles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  helper?: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  onChange?: (e: any) => void; // Using any here to accommodate existing handlers expecting e.target.value
}

export function Select({
  label,
  error,
  helper,
  options,
  placeholder,
  className = '',
  id,
  value,
  onChange,
  name,
  disabled,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;
  const hasError = !!error;

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    if (onChange) {
      // Pass a mocked event to keep compatibility with existing `(e) => e.target.value` usages
      onChange({ target: { value: optionValue, name } });
    }
    setIsOpen(false);
  };

  const selectedOption = options.find((opt) => opt.value === value);

  const selectClasses = [
    formStyles['select'],
    selectStyles.customSelect,
    isOpen ? selectStyles.open : '',
    hasError ? formStyles['errorInput'] : '',
    disabled ? formStyles['disabled'] : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={formStyles['group']} ref={containerRef}>
      {label && (
        <label htmlFor={selectId} className={formStyles['label']}>
          {label}
        </label>
      )}
      
      {name && <input type="hidden" name={name} value={value || ''} />}

      <div className={selectStyles.wrapper}>
        <div 
          id={selectId}
          className={selectClasses}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className={selectedOption ? selectStyles.selectedText : selectStyles.placeholder}>
            {selectedOption ? selectedOption.label : (placeholder || 'Seleccionar...')}
          </span>
          <svg className={selectStyles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {isOpen && (
          <ul className={selectStyles.dropdown} role="listbox">
            {placeholder && !selectedOption && (
               <li className={selectStyles.option} style={{ opacity: 0.5, cursor: 'default' }}>
                 {placeholder}
               </li>
            )}
            {options.map((option) => (
              <li 
                key={option.value}
                className={`${selectStyles.option} ${option.value === value ? selectStyles.selectedOption : ''}`}
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={option.value === value}
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasError && (
        <span id={errorId} role="alert" className={`${formStyles['helper']} ${formStyles['errorMessage']}`}>
          {error}
        </span>
      )}
      {!hasError && helper && (
        <span id={helperId} className={formStyles['helper']}>
          {helper}
        </span>
      )}
    </div>
  );
}
