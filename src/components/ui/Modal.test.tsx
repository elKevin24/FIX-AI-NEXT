import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Modal } from './Modal';

describe('Modal component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        Modal Content
      </Modal>
    );

    expect(screen.queryByText('Test Modal')).toBeNull();
    expect(screen.queryByText('Modal Content')).toBeNull();
  });

  it('renders modal content, header, and footer when isOpen is true', () => {
    const handleClose = vi.fn();
    render(
      <Modal
        isOpen={true}
        onClose={handleClose}
        title="Diagnostic Summary"
        footer={<button>Confirm Action</button>}
      >
        <p>Repair order details</p>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByRole('heading', { name: /diagnostic summary/i })).toBeDefined();
    expect(screen.getByText('Repair order details')).toBeDefined();
    expect(screen.getByRole('button', { name: /confirm action/i })).toBeDefined();

    // Close button click
    const closeBtn = screen.getByLabelText(/cerrar modal/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key press', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Escapable Modal">
        Body
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
