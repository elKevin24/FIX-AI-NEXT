import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import NotificationBell from './NotificationBell';

const mockNotifications = [
  {
    id: '1',
    title: 'Ticket Urgente',
    message: 'Máquina CNC fuera de servicio',
    type: 'ERROR',
    isRead: false,
    link: '/dashboard/tickets/1',
    createdAt: new Date('2025-01-15T10:00:00Z'),
  },
  {
    id: '2',
    title: 'Mantenimiento',
    message: 'Recordatorio de mantenimiento preventivo',
    type: 'WARNING',
    isRead: true,
    link: null,
    createdAt: new Date('2025-01-14T08:00:00Z'),
  },
  {
    id: '3',
    title: 'Completado',
    message: 'Ticket #42 finalizado',
    type: 'SUCCESS',
    isRead: false,
    link: '/dashboard/tickets/42',
    createdAt: new Date('2025-01-13T12:00:00Z'),
  },
];

const mockGetMyNotifications = vi.fn();
const mockMarkAsRead = vi.fn();
const mockMarkAllRead = vi.fn();
const mockAddToast = vi.fn();

vi.mock('@/lib/notifications', () => ({
  getMyNotifications: (...args: any[]) => mockGetMyNotifications(...args),
  markMyNotificationAsRead: (...args: any[]) => mockMarkAsRead(...args),
  markAllMyNotificationsAsRead: (...args: any[]) => mockMarkAllRead(...args),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, onClick, ...props }: any) =>
    <a href={href} onClick={onClick} {...props}>{children}</a>,
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMyNotifications.mockResolvedValue(mockNotifications);
  });

  it('renders bell button', async () => {
    await act(async () => { render(<NotificationBell />); });
    expect(screen.getByLabelText('Notificaciones')).toBeDefined();
  });

  it('shows unread count badge', async () => {
    await act(async () => { render(<NotificationBell />); });
    await waitFor(() => {
      expect(screen.getByText('2')).toBeDefined();
    });
  });

  it('does not show badge when all read', async () => {
    mockGetMyNotifications.mockResolvedValue(
      mockNotifications.map(n => ({ ...n, isRead: true }))
    );
    await act(async () => { render(<NotificationBell />); });
    await waitFor(() => {
      expect(mockGetMyNotifications).toHaveBeenCalled();
    });
    expect(screen.queryByText('2')).toBeNull();
  });

  it('opens dropdown on click', async () => {
    await act(async () => { render(<NotificationBell />); });
    await waitFor(() => {
      expect(screen.getByText('2')).toBeDefined();
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Notificaciones'));
    });
    expect(screen.getByText('Notificaciones')).toBeDefined();
    expect(screen.getByText('Ticket Urgente')).toBeDefined();
    expect(screen.getByText('Mantenimiento')).toBeDefined();
    expect(screen.getByText('Completado')).toBeDefined();
  });

  it('shows empty state when no notifications', async () => {
    mockGetMyNotifications.mockResolvedValue([]);
    await act(async () => { render(<NotificationBell />); });
    await waitFor(() => {
      expect(mockGetMyNotifications).toHaveBeenCalled();
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Notificaciones'));
    });
    expect(screen.getByText('No tienes notificaciones.')).toBeDefined();
  });

  it('calls markAsRead and updates state', async () => {
    mockMarkAsRead.mockResolvedValue(undefined);
    await act(async () => { render(<NotificationBell />); });
    await waitFor(() => { expect(screen.getByText('2')).toBeDefined(); });
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Notificaciones'));
    });
    const markBtns = screen.getAllByTitle('Marcar como leída');
    await act(async () => { fireEvent.click(markBtns[0]!); });
    expect(mockMarkAsRead).toHaveBeenCalledWith('1');
  });

  it('calls markAllAsRead', async () => {
    mockMarkAllRead.mockResolvedValue(undefined);
    await act(async () => { render(<NotificationBell />); });
    await waitFor(() => { expect(screen.getByText('2')).toBeDefined(); });
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Notificaciones'));
    });
    await act(async () => { fireEvent.click(screen.getByText('Marcar leídas')); });
    expect(mockMarkAllRead).toHaveBeenCalled();
  });

  it('shows "Ver todas las notificaciones" link when dropdown is open', async () => {
    await act(async () => { render(<NotificationBell />); });
    await waitFor(() => { expect(screen.getByText('2')).toBeDefined(); });
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Notificaciones'));
    });
    expect(screen.getByText('Ver todas las notificaciones')).toBeDefined();
  });

  it('includes link to /dashboard/notifications', async () => {
    await act(async () => { render(<NotificationBell />); });
    await waitFor(() => { expect(screen.getByText('2')).toBeDefined(); });
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Notificaciones'));
    });
    const link = screen.getByText('Ver todas las notificaciones');
    expect(link.getAttribute('href')).toBe('/dashboard/notifications');
  });

  it('fetches notifications on mount', async () => {
    await act(async () => { render(<NotificationBell />); });
    await waitFor(() => {
      expect(mockGetMyNotifications).toHaveBeenCalledTimes(1);
    });
  });

  it('logs error when fetch fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetMyNotifications.mockRejectedValue(new Error('Network error'));
    await act(async () => { render(<NotificationBell />); });
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });
});
