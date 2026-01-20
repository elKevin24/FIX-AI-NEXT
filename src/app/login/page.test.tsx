import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoginPage from './page';

vi.mock('@/lib/actions', () => ({
  authenticate: vi.fn(),
}));

describe('LoginPage', () => {
  it('renders login form elements', () => {
    render(<LoginPage />);
    
    // Check for inputs
    expect(screen.getByLabelText(/correo electrónico/i)).toBeDefined();
    expect(screen.getByLabelText('Contraseña', { selector: 'input' })).toBeDefined();
    
    // Check for button
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeDefined();
    
    // Check for demo credentials text
    expect(screen.getByText(/credenciales de demostración/i)).toBeDefined();
  });
});
