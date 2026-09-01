import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal component', () => {
  it('does not render content when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Título Modal">
        <p>Contenido Oculto</p>
      </Modal>
    );

    expect(screen.queryByText('Título Modal')).toBeNull();
    expect(screen.queryByText('Contenido Oculto')).toBeNull();
  });

  it('renders title and children when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Título Modal">
        <p>Contenido Visible</p>
      </Modal>
    );

    expect(screen.getByText('Título Modal')).toBeDefined();
    expect(screen.getByText('Contenido Visible')).toBeDefined();
  });

  it('calls onClose when clicking close button', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Título Modal">
        <p>Contenido</p>
      </Modal>
    );

    const closeButton = screen.getByRole('button', { name: /cerrar modal/i });
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
