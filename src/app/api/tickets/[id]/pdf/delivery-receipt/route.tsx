import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { renderToStream } from '@react-pdf/renderer';
import { DeliveryReceiptPDF } from '@/components/pdf/DeliveryReceiptPDF';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { id } = await params;
        const isSuperAdmin = session.user.email === 'adminkev@example.com';

        // Buscar el ticket con toda la información necesaria, incluyendo notas
        const ticket = await prisma.ticket.findUnique({
            where: { id },
            include: {
                customer: true,
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                tenant: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                notes: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
            },
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
        }

        // Verificar permisos de tenant (a menos que sea super admin)
        if (!isSuperAdmin && ticket.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        // Verificar que el ticket esté completado (RESOLVED o CLOSED)
        if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
            return NextResponse.json(
                { error: 'El comprobante de entrega solo está disponible para tickets resueltos o cerrados' },
                { status: 400 }
            );
        }

        // Generar el PDF
        const stream = await renderToStream(<DeliveryReceiptPDF ticket={ticket} />);

        // Convertir el stream a buffer
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);

        // Retornar el PDF con headers apropiados
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="comprobante-entrega-${ticket.id.slice(0, 8)}.pdf"`,
            },
        });
    } catch (error) {
        console.error('Error generando PDF:', error);
        return NextResponse.json(
            { error: 'Error al generar el PDF' },
            { status: 500 }
        );
    }
}
