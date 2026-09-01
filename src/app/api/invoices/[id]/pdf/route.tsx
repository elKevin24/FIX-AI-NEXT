import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { isSuperAdmin } from '@/lib/authz';
import { renderToStream } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/pdf/InvoicePDF';

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
        const isSuperAdminUser = isSuperAdmin(session.user);
        const tenantId = session.user.tenantId;

        const includeRelations = {
            tenant: true,
            customer: true,
            ticket: {
                include: {
                    partsUsed: {
                        include: {
                            part: true
                        }
                    }
                }
            },
            payments: true
        };

        // Buscar la factura con toda la información necesaria
        let invoice;
        if (isSuperAdminUser) {
            invoice = await prisma.invoice.findUnique({
                where: { id },
                include: includeRelations,
            });
        } else {
            if (!tenantId) {
                return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
            }
            const tenantPrisma = getTenantPrisma(tenantId);
            invoice = await tenantPrisma.invoice.findUnique({
                where: { id },
                include: includeRelations,
            });
        }

        if (!invoice) {
            return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
        }

        // Transformar datos para el componente PDF (Prisma.Decimal -> number)
        const serializedInvoice = {
            ...invoice,
            laborCost: Number(invoice.laborCost),
            partsCost: Number(invoice.partsCost),
            subtotal: Number(invoice.subtotal),
            taxAmount: Number(invoice.taxAmount),
            discountAmount: Number(invoice.discountAmount),
            total: Number(invoice.total),
            ticket: {
                ...invoice.ticket,
                ticketNumber: (invoice.ticket as any).ticketNumber || invoice.ticket.id.slice(0, 8),
                partsUsed: invoice.ticket.partsUsed.map(pu => ({
                    partName: pu.part.name,
                    quantity: pu.quantity,
                    unitPrice: Number(pu.part.price),
                    total: Number(pu.part.price) * pu.quantity
                }))
            }
        };

        // Generar el PDF
        const stream = await renderToStream(<InvoicePDF invoice={serializedInvoice as any} />);

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
                'Content-Disposition': `attachment; filename="factura-${invoice.invoiceNumber}.pdf"`,
            },
        });
    } catch (error) {
        console.error('Error generando PDF de factura:', error);
        return NextResponse.json(
            { error: 'Error al generar el PDF' },
            { status: 500 }
        );
    }
}
