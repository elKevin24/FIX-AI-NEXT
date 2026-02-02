import { prisma } from '@/lib/prisma';

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
    const logs = await prisma.auditLog.findMany({
        where: {
            tenantId: tenantId,
            details: {
                contains: ticketId,
            },
            // Filter out redundant note logs since we fetch notes separately
            NOT: {
              action: {
                in: ['CREATE_TICKETNOTE', 'UPDATE_TICKETNOTE', 'DELETE_TICKETNOTE']
              }
            }
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
        const { content, type } = parseLogMessage(log.action, log.details);
        return {
            id: log.id,
            type: type,
            date: log.createdAt,
            author: {
                name: log.user?.name || 'Sistema',
                email: log.user?.email || 'system@fixai.com',
            },
            content: content,
            details: log.details ? JSON.parse(log.details) : null,
        };
    });

    const timeline = [...normalizedNotes, ...normalizedLogs].sort((a, b) => 
        b.date.getTime() - a.date.getTime()
    );

    return timeline;
}

export function parseLogMessage(action: string, detailsStr: string | null): { content: string, type: TimelineEvent['type'] } {
    let details: any = {};
    try {
        details = detailsStr ? JSON.parse(detailsStr) : {};
    } catch (e) {}

    let content: string;
    let type: TimelineEvent['type'] = 'LOG';

    switch (action) {
        case 'CREATE_TICKET':
            content = 'Ticket creado';
            type = 'LOG';
            break;
            
        case 'UPDATE_TICKET':
            const changes = details.changes || {};
            const parts = [];
            
            if (changes.status) {
                parts.push(`Estado cambiado a ${changes.status}`);
                type = 'STATUS_CHANGE';
            }
            if (changes.priority) parts.push(`Prioridad cambiada a ${changes.priority}`);
            if (changes.title) parts.push(`Título actualizado`);
            if (changes.assignedToId) parts.push(`Asignación actualizada`);
            
            content = parts.length > 0 ? parts.join(', ') : 'Ticket actualizado';
            break;
            
        case 'DELETE_TICKET':
            content = 'Ticket eliminado';
            type = 'LOG';
            break;

        case 'CREATE_PARTUSAGE':
            content = `Movimiento de inventario: Agregado repuesto/item`;
            if (details.data && details.data.quantity) {
                content += ` (Cant: ${details.data.quantity})`;
            }
            type = 'INVENTORY_MOVEMENT';
            break;
            
        case 'DELETE_PARTUSAGE':
             content = `Movimiento de inventario: Removido repuesto/item`;
             type = 'INVENTORY_MOVEMENT';
             break;

        case 'CREATE_TICKETSERVICE':
            content = `Servicio/Mano de obra agregado`;
            if (details.data && details.data.name) {
                content += `: ${details.data.name}`;
            }
            type = 'SERVICE_USAGE';
            break;

        case 'DELETE_TICKETSERVICE':
            content = `Servicio removido`;
            type = 'SERVICE_USAGE';
            break;

        case 'CREATE_TICKETATTACHMENT':
            content = `Archivo adjunto subido`;
            if (details.data && details.data.filename) {
                content += `: ${details.data.filename}`;
            }
            type = 'LOG';
            // Could be distinct 'ATTACHMENT' type if desired
            break;

        case 'DELETE_TICKETATTACHMENT':
            content = `Archivo adjunto eliminado`;
            type = 'LOG';
            break;

        default:
            // Improve formatting for generic logs
            content = action.replace(/_/g, ' ')
                            .replace('CREATE', 'Crear')
                            .replace('UPDATE', 'Actualizar')
                            .replace('DELETE', 'Eliminar');
            type = 'LOG';
    }

    return { content, type };
}
