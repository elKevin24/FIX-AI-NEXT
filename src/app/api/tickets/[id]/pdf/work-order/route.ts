import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { renderToStream } from '@react-pdf/renderer';
import { WorkOrderPDF } from '@/components/pdf/WorkOrderPDF';

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

        // Buscar el ticket con toda la información necesaria
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
            },
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
        }

        // Verificar permisos de tenant (a menos que sea super admin)
        if (!isSuperAdmin && ticket.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        // Generar el PDF
        const stream = await renderToStream(<WorkOrderPDF ticket={ticket} />);

        // Convertir el stream a buffer
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Retornar el PDF con headers apropiados
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="orden-ingreso-${ticket.id.slice(0, 8)}.pdf"`,
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
