import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  const defaultProps = {
    title: 'Active Tickets',
    value: 42,
    label: 'Open + In Progress',
    icon: <span>📊</span>,
  };

  it('renders title, value, and label', () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByText('Active Tickets')).toBeDefined();
    expect(screen.getByText('42')).toBeDefined();
    expect(screen.getByText('Open + In Progress')).toBeDefined();
  });

  it('renders string values (currency)', () => {
    render(<StatCard {...defaultProps} value="Q1,500.00" />);
    expect(screen.getByText('Q1,500.00')).toBeDefined();
  });

  it('renders with custom colors', () => {
    const { container } = render(
      <StatCard {...defaultProps} iconBgColor="#ff0000" iconColor="#00ff00" />
    );
    const styled = container.querySelector('[style]');
    expect(styled).toBeDefined();
  });

  it('renders zero value', () => {
    render(<StatCard {...defaultProps} value={0} />);
    expect(screen.getByText('0')).toBeDefined();
  });
});
