import { prisma } from '@/lib/prisma';
import { AuditAction } from '@/generated/prisma';

export interface TimelineEvent {
    id: string;
    type: 'NOTE' | 'STATUS_CHANGE' | 'INVENTORY_MOVEMENT' | 'SERVICE_USAGE' | 'LOG';
    date: Date;
    author: {
        name: string | null;
        email: string;
        image?: string | null;
    };
    content: string;
    details?: any;
}

export async function getTicketTimeline(ticketId: string, tenantId: string): Promise<TimelineEvent[]> {
    // 1. Fetch Ticket Notes
    const notes = await prisma.ticketNote.findMany({
        where: {
            ticketId: ticketId,
        },
        include: {
            author: {
                select: {
                    name: true,
                    email: true,
                }
            }
        },
        orderBy: {
            createdAt: 'desc',
        }
    });

    // 2. Fetch Audit Logs related to this ticket
    // New schema uses entityId for the relation
    const logs = await prisma.auditLog.findMany({
        where: {
            tenantId: tenantId,
            entityId: ticketId,
            module: 'TICKETS'
        },
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                }
            }
        },
        orderBy: {
            createdAt: 'desc',
        }
    });

    // 3. Normalize and Merge
    const normalizedNotes: TimelineEvent[] = notes.map(note => ({
        id: note.id,
        type: 'NOTE',
        date: note.createdAt,
        author: {
            name: note.author.name,
            email: note.author.email,
        },
        content: note.content,
    }));

    const normalizedLogs: TimelineEvent[] = logs.map(log => {
        const { content, type } = parseLogMessage(log.action, log.metadata);
        return {
            id: log.id,
            type: type,
            date: log.createdAt,
            author: {
                name: log.user?.name || 'Sistema',
                email: log.user?.email || 'system@fixai.com',
            },
            content: content,
            details: log.metadata,
        };
    });

    const timeline = [...normalizedNotes, ...normalizedLogs].sort((a, b) => 
        b.date.getTime() - a.date.getTime()
    );

    return timeline;
}

export function parseLogMessage(action: AuditAction | string, metadata: any): { content: string, type: TimelineEvent['type'] } {
    const details = metadata || {};
    let content: string;
    let type: TimelineEvent['type'] = 'LOG';

    switch (action) {
        case 'TICKET_CREATED':
            content = 'Ticket creado';
            type = 'LOG';
            break;
            
        case 'TICKET_UPDATED':
            const changes = details.changes || {};
            const parts = [];
            
            // Handle raw JSON diff from postgres trigger
            // e.g. { "status": "IN_PROGRESS" }
            if (changes.status) {
                parts.push(`Estado cambiado a ${changes.status}`);
                type = 'STATUS_CHANGE';
            }
            if (changes.priority) parts.push(`Prioridad cambiada a ${changes.priority}`);
            if (changes.title) parts.push(`Título actualizado`);
            if (changes.assignedToId) parts.push(`Asignación actualizada`);
            
            content = parts.length > 0 ? parts.join(', ') : 'Ticket actualizado';
            break;
            
        case 'TICKET_DELETED':
            content = 'Ticket eliminado';
            type = 'LOG';
            break;

        case 'TICKET_STATUS_CHANGED':
             content = `Estado cambiado`;
             if (details.old && details.new) {
                 content += ` de ${details.old} a ${details.new}`;
             }
             type = 'STATUS_CHANGE';
             break;

        // Fallback for other actions
        default:
            content = String(action).replace(/_/g, ' ')
                            .replace('CREATE', 'Crear')
                            .replace('UPDATE', 'Actualizar')
                            .replace('DELETE', 'Eliminar');
            type = 'LOG';
    }

    return { content, type };
}