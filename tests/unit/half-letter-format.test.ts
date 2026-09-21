import { describe, it, expect } from 'vitest';
import React from 'react';
import { WorkOrderHalfLetterPDF } from '@/components/pdf/WorkOrderHalfLetterPDF';
import PrintHalfLetterClient from '@/app/dashboard/tickets/[id]/print-half-letter/PrintHalfLetterClient';

describe('Half Letter (Media Carta) Ticket Format Suite', () => {
    const mockTicketData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ticketNumber: 'TICK-2026-0001',
        title: 'Mantenimiento General Laptop Dell',
        description: 'Limpieza interna de ventiladores, cambio de pasta térmica y diagnóstico de batería.',
        status: 'OPEN',
        priority: 'HIGH',
        deviceType: 'Laptop',
        deviceModel: 'Dell XPS 15 9520',
        serialNumber: 'SN9988776655',
        accessories: 'Cargador original 130W, Funda protectora',
        checkInNotes: 'Equipo presenta rayones leves en la tapa superior.',
        createdAt: new Date('2026-09-20T10:00:00Z'),
        dueDate: new Date('2026-09-22T18:00:00Z'),
        customer: {
            id: 'cust-1',
            name: 'Carlos Mendoza',
            email: 'carlos@example.com',
            phone: '+502 5555-1234',
            address: 'Ciudad de Guatemala, Zona 10',
            dpi: '1234567890101',
            nit: '887766-5',
        },
        tenant: {
            id: 'tenant-1',
            name: 'Fix Electronic Solutions',
            settings: {
                businessName: 'Fix Electronic Solutions S.A.',
                businessNIT: '998877-1',
                businessAddress: 'Av. Las Américas 12-45, Zona 14',
                businessPhone: '+502 2222-3333',
                businessEmail: 'contacto@fixelectronics.gt',
                currency: 'GTQ',
            },
        },
        assignedTo: {
            id: 'user-tech-1',
            name: 'Mario Ingeniero',
            email: 'mario@fixelectronics.gt',
        },
        partsUsed: [
            {
                id: 'pu-1',
                quantity: 1,
                part: {
                    id: 'part-1',
                    name: 'Pasta Térmica Arctic MX-4',
                    sku: 'PST-MX4',
                    price: '75.00',
                },
            },
        ],
        services: [
            {
                id: 'svc-1',
                name: 'Servicio de Mantenimiento Preventivo',
                laborCost: '150.00',
            },
        ],
    };

    it('should instantiate WorkOrderHalfLetterPDF without crashing', () => {
        const element = React.createElement(WorkOrderHalfLetterPDF, {
            ticket: mockTicketData,
        });
        expect(element).toBeDefined();
        expect(element.type).toBe(WorkOrderHalfLetterPDF);
        expect(element.props.ticket.ticketNumber).toBe('TICK-2026-0001');
    });

    it('should instantiate PrintHalfLetterClient without crashing', () => {
        const element = React.createElement(PrintHalfLetterClient, {
            ticket: mockTicketData,
        });
        expect(element).toBeDefined();
        expect(element.type).toBe(PrintHalfLetterClient);
        expect(element.props.ticket.customer.name).toBe('Carlos Mendoza');
    });

    it('should handle optional and fallback fields gracefully in PDF element', () => {
        const minimalTicket = {
            id: 'min-1234-5678',
            title: 'Reparación Express',
            description: 'Cambio de pantalla',
            status: 'IN_PROGRESS',
            priority: null,
            createdAt: new Date(),
            customer: {
                name: 'Ana López',
            },
            tenant: {
                name: 'Taller Demo',
            },
        };

        const element = React.createElement(WorkOrderHalfLetterPDF, {
            ticket: minimalTicket as any,
        });
        expect(element).toBeDefined();
        expect(element.props.ticket.title).toBe('Reparación Express');
    });
});
