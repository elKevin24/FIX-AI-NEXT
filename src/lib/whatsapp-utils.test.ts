import { describe, it, expect } from 'vitest';
import { sanitizePhoneNumber, generateWhatsAppMessage, buildWhatsAppUrl, WhatsAppTicketInfo } from './whatsapp-utils';

describe('whatsapp-utils', () => {
    const mockTicket: WhatsAppTicketInfo = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ticketNumber: 'TK-2026-001',
        title: 'Cambio de Pantalla',
        status: 'RESOLVED',
        deviceType: 'Smartphone',
        deviceModel: 'Samsung S22',
        totalAmount: '450.00',
        customer: {
            name: 'Carlos Mendoza',
            phone: '55551234',
        },
        tenant: {
            name: 'Taller Fix Express',
        },
    };

    describe('sanitizePhoneNumber', () => {
        it('should prepend default country code for 8-digit numbers', () => {
            expect(sanitizePhoneNumber('55551234')).toBe('50255551234');
            expect(sanitizePhoneNumber('5555-1234')).toBe('50255551234');
            expect(sanitizePhoneNumber('+502 5555 1234')).toBe('50255551234');
        });

        it('should keep full international numbers intact', () => {
            expect(sanitizePhoneNumber('+52 55 1234 5678')).toBe('525512345678');
        });

        it('should return empty string for invalid numbers', () => {
            expect(sanitizePhoneNumber('')).toBe('');
            expect(sanitizePhoneNumber('abc')).toBe('');
        });
    });

    describe('generateWhatsAppMessage', () => {
        it('should generate RESOLVED message with total amount', () => {
            const msg = generateWhatsAppMessage(mockTicket, 'RESOLVED');
            expect(msg).toContain('Carlos Mendoza');
            expect(msg).toContain('Smartphone Samsung S22');
            expect(msg).toContain('TK-2026-001');
            expect(msg).toContain('REPARADO Y LISTO PARA RETIRO');
            expect(msg).toContain('Q450.00');
        });

        it('should generate INTAKE message for newly received tickets', () => {
            const msg = generateWhatsAppMessage(mockTicket, 'INTAKE');
            expect(msg).toContain('recepción de tu Smartphone Samsung S22');
            expect(msg).toContain('Cambio de Pantalla');
        });

        it('should generate QUOTE message with budget', () => {
            const msg = generateWhatsAppMessage(mockTicket, 'QUOTE');
            expect(msg).toContain('presupuesto para la reparación');
            expect(msg).toContain('Q450.00');
        });
    });

    describe('buildWhatsAppUrl', () => {
        it('should return a valid wa.me link with URL-encoded text', () => {
            const url = buildWhatsAppUrl(mockTicket);
            expect(url).toBeDefined();
            expect(url).toContain('https://wa.me/50255551234?text=');
            expect(url).toContain(encodeURIComponent('Carlos Mendoza'));
        });

        it('should return null if customer has no phone', () => {
            const noPhoneTicket: WhatsAppTicketInfo = {
                ...mockTicket,
                customer: { name: 'Sin Teléfono', phone: null },
            };
            expect(buildWhatsAppUrl(noPhoneTicket)).toBeNull();
        });
    });
});
