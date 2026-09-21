import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { isSuperAdmin } from '@/lib/authz';
import { renderToStream } from '@react-pdf/renderer';
import { WorkOrderHalfLetterPDF } from '@/components/pdf/WorkOrderHalfLetterPDF';

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
        const isSuperAdminUser = isSuperAdmin(session.user);
        const tenantId = session.user.tenantId;

        let ticket: any;

        const ticketInclude = {
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
                    settings: true,
                },
            },
            services: true,
            partsUsed: {
                include: {
                    part: true,
                },
            },
        };

        if (isSuperAdminUser) {
            ticket = await prisma.ticket.findUnique({
                where: { id },
                include: ticketInclude,
            });
        } else {
            const tenantPrisma = getTenantPrisma(tenantId);
            ticket = await tenantPrisma.ticket.findUnique({
                where: { id },
                include: ticketInclude,
            });
        }

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
        }

        // Render PDF Stream
        const stream = await renderToStream(<WorkOrderHalfLetterPDF ticket={ticket} />);

        // Convert stream to buffer
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);

        const filename = `ticket-media-carta-${ticket.ticketNumber || ticket.id.slice(0, 8)}.pdf`;

        // Check if download or inline display requested
        const { searchParams } = new URL(request.url);
        const disposition = searchParams.get('inline') === 'true' ? 'inline' : 'attachment';

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `${disposition}; filename="${filename}"`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    } catch (error) {
        console.error('Error generando PDF Media Carta:', error);
        return NextResponse.json(
            { error: 'Error al generar el PDF en media carta' },
            { status: 500 }
        );
    }
}
