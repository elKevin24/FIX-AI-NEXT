
import { describe, it, expect } from 'vitest';
import { parseLogMessage } from './timeline';

describe('Timeline Logic', () => {
    describe('parseLogMessage', () => {
        it('should parse CREATE_TICKET', () => {
            const { content, type } = parseLogMessage('CREATE_TICKET', null);
            expect(content).toBe('Ticket creado');
            expect(type).toBe('LOG');
        });

        it('should parse UPDATE_TICKET with status change', () => {
            const details = JSON.stringify({ changes: { status: 'IN_PROGRESS' } });
            const { content, type } = parseLogMessage('UPDATE_TICKET', details);
            expect(content).toContain('Estado cambiado a IN_PROGRESS');
            expect(type).toBe('STATUS_CHANGE');
        });

        it('should parse UPDATE_TICKET with assignment change', () => {
            const details = JSON.stringify({ changes: { assignedToId: '123' } });
            const { content, type } = parseLogMessage('UPDATE_TICKET', details);
            expect(content).toContain('Asignación actualizada');
            // Status change takes precedence for type if present, but if only assignment, it should be LOG (default behavior in my code?)
            // Let's check logic: type='STATUS_CHANGE' only if changes.status.
            // If only assignedToId, type remains 'LOG'.
            expect(type).toBe('LOG');
        });

        it('should parse UPDATE_TICKET with both status and assignment', () => {
            const details = JSON.stringify({ changes: { status: 'RESOLVED', assignedToId: '123' } });
            const { content, type } = parseLogMessage('UPDATE_TICKET', details);
            expect(content).toContain('Estado cambiado a RESOLVED');
            expect(content).toContain('Asignación actualizada');
            expect(type).toBe('STATUS_CHANGE');
        });

        it('should parse CREATE_PARTUSAGE', () => {
            const details = JSON.stringify({ data: { quantity: 2 } });
            const { content, type } = parseLogMessage('CREATE_PARTUSAGE', details);
            expect(content).toContain('Movimiento de inventario');
            expect(content).toContain('Cant: 2');
            expect(type).toBe('INVENTORY_MOVEMENT');
        });

        it('should parse CREATE_TICKETSERVICE', () => {
            const details = JSON.stringify({ data: { name: 'Installation' } });
            const { content, type } = parseLogMessage('CREATE_TICKETSERVICE', details);
            expect(content).toContain('Servicio/Mano de obra agregado');
            expect(content).toContain('Installation');
            expect(type).toBe('SERVICE_USAGE');
        });

        it('should parse CREATE_TICKETATTACHMENT', () => {
             const details = JSON.stringify({ data: { filename: 'image.png' } });
             const { content, type } = parseLogMessage('CREATE_TICKETATTACHMENT', details);
             expect(content).toContain('Archivo adjunto subido');
             expect(content).toContain('image.png');
             expect(type).toBe('LOG');
        });
    });
});
