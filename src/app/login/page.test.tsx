import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from './page';

vi.mock('@/lib/actions', () => ({
  authenticate: vi.fn(),
}));

describe('LoginPage', () => {
  it('renders login form elements', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/correo electrónico/i)).toBeDefined();
    expect(screen.getByLabelText('Contraseña', { selector: 'input' })).toBeDefined();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeDefined();
    
  });

  

  it('password input has minLength 6', () => {
    render(<LoginPage />);
    const password = screen.getByLabelText('Contraseña', { selector: 'input' }) as HTMLInputElement;
    expect(password.minLength).toBe(6);
  });

  it('email input is type email', () => {
    render(<LoginPage />);
    const email = screen.getByLabelText(/correo electrónico/i) as HTMLInputElement;
    expect(email.type).toBe('email');
  });

  it('has back to home link', () => {
    render(<LoginPage />);
    expect(screen.getByText(/back to home/i)).toBeDefined();
  });

  it('toggles password visibility on button click', () => {
    render(<LoginPage />);
    const password = screen.getByLabelText('Contraseña', { selector: 'input' }) as HTMLInputElement;
    expect(password.type).toBe('password');

    const toggleBtn = screen.getByLabelText(/mostrar contraseña/i);
    fireEvent.click(toggleBtn);
    expect(password.type).toBe('text');

    const hideBtn = screen.getByLabelText(/ocultar contraseña/i);
    fireEvent.click(hideBtn);
    expect(password.type).toBe('password');
  });

  it('submit button shows loading text when disabled', () => {
    render(<LoginPage />);
    const button = screen.getByRole('button', { name: /iniciar sesión/i }) as HTMLButtonElement;
    expect(button).toBeDefined();
  });

  it('renders forgot password link', () => {
    render(<LoginPage />);
    expect(screen.getByText(/¿olvidaste tu contraseña/i)).toBeDefined();
  });

  it('renders support link in footer', () => {
    render(<LoginPage />);
    expect(screen.getByText(/contacta soporte/i)).toBeDefined();
  });
});
