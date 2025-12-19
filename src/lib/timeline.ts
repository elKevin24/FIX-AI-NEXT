import { prisma } from '@/lib/prisma';

export interface TimelineEvent {
    id: string;
    type: 'NOTE' | 'LOG';
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
    // Since we reverted the schema change, we search in the 'details' JSON string
    const logs = await prisma.auditLog.findMany({
        where: {
            tenantId: tenantId,
            details: {
                contains: ticketId,
            },
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
        let content = formatLogMessage(log.action, log.details);
        return {
            id: log.id,
            type: 'LOG',
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

function formatLogMessage(action: string, detailsStr: string | null): string {
    let details: any = {};
    try {
        details = detailsStr ? JSON.parse(detailsStr) : {};
    } catch (e) {}

    switch (action) {
        case 'CREATE_TICKET':
            return 'Ticket creado';
        case 'UPDATE_TICKET':
            const changes = details.changes || {};
            const parts = [];
            if (changes.status) parts.push(`Estado cambiado a ${changes.status}`);
            if (changes.priority) parts.push(`Prioridad cambiada a ${changes.priority}`);
            if (changes.title) parts.push(`Título actualizado`);
            return parts.length > 0 ? parts.join(', ') : 'Ticket actualizado';
        case 'DELETE_TICKET':
            return 'Ticket eliminado';
        default:
            return action;
    }
}
