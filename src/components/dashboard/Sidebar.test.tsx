import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';

// Mock usePathname
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

// Mock Link to avoid Next.js routing issues in test
vi.mock('next/link', () => {
  return {
    default: ({ children, href, className }: { children: React.ReactNode, href: string, className?: string }) => (
      <a href={href} className={className}>{children}</a>
    ),
  };
});

// Mock ThemeContext
vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    resolvedTheme: 'light',
  }),
}));

// Mock NotificationBell
vi.mock('./NotificationBell', () => ({
  default: () => <div data-testid="notification-bell">🔔</div>,
}));

// Mock ThemeSwitcher (to avoid its own internal complexity in this test)
vi.mock('@/components/ui/ThemeSwitcher', () => ({
  default: () => <div data-testid="theme-switcher">🎨</div>,
}));

describe('Sidebar Component', () => {
  const logoutButton = <button>Cerrar Sesión</button>;

  it('renders navigation links correctly', () => {
    render(<Sidebar logoutButton={logoutButton} />);
    
    expect(screen.getByText('Inicio')).toBeDefined();
    expect(screen.getByText('Tickets')).toBeDefined();
    expect(screen.getByText('Clientes')).toBeDefined();
    expect(screen.getByText('Usuarios')).toBeDefined();
    expect(screen.getByText('Configuración')).toBeDefined();
  });

  it('renders the logout button', () => {
    render(<Sidebar logoutButton={logoutButton} />);
    expect(screen.getByText('Cerrar Sesión')).toBeDefined();
  });

  it('renders close button and allows closing on mobile', () => {
    render(<Sidebar logoutButton={logoutButton} />);

    const closeBtn = screen.getByLabelText('Cerrar menú');
    expect(closeBtn).toBeDefined();
    fireEvent.click(closeBtn);
  });
});
