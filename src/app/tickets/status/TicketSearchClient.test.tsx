import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TicketSearchClient from './TicketSearchClient';
import { ThemeProvider } from '@/contexts/ThemeContext';
import * as actions from '@/lib/actions';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

vi.mock('@/lib/actions', () => ({
    searchTicket: vi.fn(),
    publicCustomerApproval: vi.fn(),
}));

const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider>{ui}</ThemeProvider>);
};

describe('TicketSearchClient (Portal de Clientes)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockDemoTickets = [
        { id: '11112222-3333-4444-5555-666677778888', title: 'iPhone 13 Pantalla Rota', deviceType: 'Smartphone' },
        { id: '22223333-4444-5555-6666-777788889999', title: 'MacBook Air no enciende', deviceType: 'Laptop' },
    ];

    it('renders search form and demo buttons', () => {
        renderWithTheme(<TicketSearchClient demoTickets={mockDemoTickets} />);
        expect(screen.getByPlaceholderText('Número o ID de Ticket (ej: TK-1001)')).toBeDefined();
        expect(screen.getByText(/Demo Smartphone/)).toBeDefined();
        expect(screen.getByText(/Demo Laptop/)).toBeDefined();
    });

    it('performs search on demo button click and displays ticket status', async () => {
        const mockTicket = {
            id: '11112222-3333-4444-5555-666677778888',
            ticketNumber: 'TK-101',
            title: 'iPhone 13 Pantalla Rota',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            deviceType: 'Smartphone',
            deviceModel: 'iPhone 13',
            customerName: 'Carlos Gómez',
            description: 'Pantalla con líneas y táctil no responde',
            createdAt: new Date().toISOString(),
            parts: [],
            services: [],
            timeline: [],
        };

        vi.mocked(actions.searchTicket).mockResolvedValue(mockTicket as any);

        renderWithTheme(<TicketSearchClient demoTickets={mockDemoTickets} />);
        const demoBtn = screen.getByText(/Demo Smartphone/);
        fireEvent.click(demoBtn);

        await waitFor(() => {
            expect(actions.searchTicket).toHaveBeenCalledWith('11112222', undefined);
        });

        await waitFor(() => {
            expect(screen.getByText('iPhone 13 Pantalla Rota')).toBeDefined();
        });
    });

    it('displays error message when ticket is not found', async () => {
        vi.mocked(actions.searchTicket).mockResolvedValue(null);

        renderWithTheme(<TicketSearchClient demoTickets={mockDemoTickets} />);
        const input = screen.getByPlaceholderText('Número o ID de Ticket (ej: TK-1001)');
        const searchBtn = screen.getByRole('button', { name: /Consultar Ticket/i });

        fireEvent.change(input, { target: { value: 'TK-999' } });
        fireEvent.click(searchBtn);

        await waitFor(() => {
            expect(screen.getByText('ID o código de ticket no encontrado.')).toBeDefined();
        });
    });

    it('renders with initial ticket if provided by server component', () => {
        const mockInitialTicket = {
            id: '33334444-5555-6666-7777-888899990000',
            ticketNumber: 'TK-202',
            title: 'iPad Pro Reparación',
            status: 'RESOLVED',
            priority: 'MEDIUM',
            deviceType: 'Tablet',
            deviceModel: 'iPad Pro 11',
            customerName: 'Ana Ruiz',
            description: 'Cambio de batería completado',
            createdAt: new Date().toISOString(),
            parts: [],
            services: [],
            timeline: [],
        };

        renderWithTheme(
            <TicketSearchClient 
                demoTickets={mockDemoTickets} 
                initialTicket={mockInitialTicket}
                initialQuery="TK-202"
            />
        );

        expect(screen.getByText('iPad Pro Reparación')).toBeDefined();
    });
});
