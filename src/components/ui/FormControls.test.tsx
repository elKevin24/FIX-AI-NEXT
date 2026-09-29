import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Input } from './Input';
import { Select } from './Select';
import { Textarea } from './Textarea';
import { Alert } from './Alert';

describe('Form Controls & Feedback', () => {
  describe('Input', () => {
    it('renders input with label, placeholder, and helper text', () => {
      render(
        <Input
          label="Customer Email"
          placeholder="email@example.com"
          helper="We will send repair updates here."
        />
      );

      expect(screen.getByLabelText(/customer email/i)).toBeDefined();
      expect(screen.getByPlaceholderText('email@example.com')).toBeDefined();
      expect(screen.getByText('We will send repair updates here.')).toBeDefined();
    });

    it('renders error state with accessible alert role', () => {
      render(
        <Input
          label="Phone Number"
          error="Phone number is required."
        />
      );

      const input = screen.getByLabelText(/phone number/i);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Phone number is required.')).toBeDefined();
    });

    it('captures user input changes', () => {
      const handleChange = vi.fn();
      render(<Input label="Device" onChange={handleChange} />);
      const input = screen.getByLabelText(/device/i);
      fireEvent.change(input, { target: { value: 'iPhone 13' } });
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Select', () => {
    const options = [
      { value: 'OPEN', label: 'Open' },
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'CLOSED', label: 'Closed' },
    ];

    it('renders select with options and placeholder', () => {
      render(
        <Select
          label="Ticket Status"
          options={options}
          placeholder="Select status..."
          defaultValue=""
        />
      );

      expect(screen.getByLabelText(/ticket status/i)).toBeDefined();
      expect(screen.getByRole('combobox')).toBeDefined();
      expect(screen.getByText('Select status...')).toBeDefined();
      expect(screen.getByText('In Progress')).toBeDefined();
    });

    it('renders error state on select', () => {
      render(
        <Select
          label="Priority"
          options={options}
          error="Please choose a priority"
        />
      );

      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Please choose a priority')).toBeDefined();
    });
  });

  describe('Textarea', () => {
    it('renders textarea with label and value', () => {
      render(
        <Textarea
          label="Fault Description"
          helper="Provide as much detail as possible"
          rows={4}
        />
      );

      expect(screen.getByLabelText(/fault description/i)).toBeDefined();
      expect(screen.getByText('Provide as much detail as possible')).toBeDefined();
    });

    it('renders textarea with error', () => {
      render(
        <Textarea
          label="Notes"
          error="Notes cannot be empty"
        />
      );

      expect(screen.getByRole('alert')).toBeDefined();
    });
  });

  describe('Alert', () => {
    it('renders alert variants correctly', () => {
      const variants = ['success', 'warning', 'error', 'info'] as const;
      variants.forEach(variant => {
        const { unmount } = render(<Alert variant={variant}>Alert: {variant}</Alert>);
        expect(screen.getByRole('alert')).toBeDefined();
        expect(screen.getByText(`Alert: ${variant}`)).toBeDefined();
        unmount();
      });
    });
  });
});
