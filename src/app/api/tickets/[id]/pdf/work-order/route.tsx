import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { renderToStream } from '@react-pdf/renderer';
import { WorkOrderPDF } from '@/components/pdf/WorkOrderPDF';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { id } = await params;
        const isSuperAdmin = session.user.email === 'adminkev@example.com';
        const tenantId = session.user.tenantId;

        let ticket;

        if (isSuperAdmin) {
            ticket = await prisma.ticket.findUnique({
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
        } else {
            const tenantPrisma = getTenantPrisma(tenantId);
            ticket = await tenantPrisma.ticket.findUnique({
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
        }

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
        }

        // Generar el PDF
        const stream = await renderToStream(<WorkOrderPDF ticket={ticket} />);

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
