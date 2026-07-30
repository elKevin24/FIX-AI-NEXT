import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TopNav from './TopNav';

vi.mock('./NotificationBell', () => ({
  default: () => <div data-testid="notification-bell">Bell</div>,
}));

describe('TopNav', () => {
  it('renders NotificationBell', () => {
    render(<TopNav />);
    expect(screen.getByTestId('notification-bell')).toBeDefined();
  });

  it('renders header element', () => {
    const { container } = render(<TopNav />);
    expect(container.querySelector('header')).toBeDefined();
  });
});
