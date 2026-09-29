import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import Toast from './Toast';

describe('Toast component', () => {
  it('renders title, message, and type correctly', () => {
    render(
      <Toast
        id="t-1"
        type="SUCCESS"
        title="Saved"
        message="Changes saved successfully"
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Saved')).toBeDefined();
    expect(screen.getByText('Changes saved successfully')).toBeDefined();
  });

  it('triggers onDismiss when close button is clicked', () => {
    vi.useFakeTimers();
    const handleDismiss = vi.fn();
    render(
      <Toast
        id="t-2"
        type="ERROR"
        message="Failed to connect"
        onDismiss={handleDismiss}
      />
    );

    const closeBtn = screen.getByLabelText(/cerrar notificación/i);
    fireEvent.click(closeBtn);

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(handleDismiss).toHaveBeenCalledWith('t-2');
    vi.useRealTimers();
  });
});
