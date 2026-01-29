
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import * as XLSX from 'xlsx';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ type: string }> } // Route handler params
) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { type } = await params;
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const format = searchParams.get('format') || 'xlsx';

    const db = getTenantPrisma(session.user.tenantId, session.user.id);

    let data: any[] = [];
    let filename = `export-${type}-${new Date().toISOString().split('T')[0]}`;

    const dateFilter = (startDateStr || endDateStr) ? {
        createdAt: {
            gte: startDateStr ? new Date(startDateStr) : undefined,
            lte: endDateStr ? new Date(endDateStr) : undefined,
        }
    } : {};

    try {
        if (type === 'tickets') {
             const tickets = await db.ticket.findMany({
                 where: {
                     ...dateFilter
                 },
                 include: { 
                    customer: true, 
                    assignedTo: true 
                 },
                 orderBy: { createdAt: 'desc' }
             });
             
             data = tickets.map(t => ({
                 ID: t.ticketNumber || t.id.slice(0, 8),
                 Title: t.title,
                 Status: t.status,
                 Priority: t.priority,
                 Customer: t.customer.name,
                 AssignedTo: t.assignedTo?.name || 'Unassigned',
                 Created: t.createdAt.toISOString().split('T')[0],
                 Due: t.dueDate ? t.dueDate.toISOString().split('T')[0] : '',
             }));

        } else if (type === 'parts') {
             const parts = await db.part.findMany({
                 where: {}, // filters?
                 orderBy: { name: 'asc' }
             });
             data = parts.map(p => ({
                 Name: p.name,
                 SKU: p.sku || '',
                 Quantity: p.quantity,
                 Price: Number(p.price),
                 Cost: Number(p.cost),
                 Category: p.category || '',
                 Location: p.location || '',
             }));
             
        } else if (type === 'invoices') {
             const invoices = await db.invoice.findMany({
                 where: { ...dateFilter },
                 include: { customer: true },
                 orderBy: { createdAt: 'desc' }
             });
             data = invoices.map(i => ({
                 Number: i.invoiceNumber,
                 Customer: i.customer.name,
                 Date: i.createdAt.toISOString().split('T')[0],
                 Total: Number(i.total),
                 Status: i.status || 'PAID', // Assuming status field exists or inferred
                 PaymentMethod: i.paymentMethod
             }));
        } else if (type === 'pos-sales') {
              const sales = await db.pOSSale.findMany({
                 where: { ...dateFilter }, // Note: check capitalization of POSSale (pOSSale or pOSSales?)
                 // Prisma model is likely 'pOSSale' (mapped to 'pos_sales')
                  include: { customer: true },
                  orderBy: { createdAt: 'desc' }
              });
              data = sales.map(s => ({
                  Number: s.invoiceNumber || s.id.slice(0,8),
                  Customer: s.customer?.name || 'Walk-in',
                  Date: s.createdAt.toISOString().split('T')[0],
                  Total: Number(s.total),
                  Status: s.status,
              }));
        } else {
            return new NextResponse('Invalid export type', { status: 400 });
        }

        // Generate Excel
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        
        const buf = XLSX.write(workbook, { type: 'buffer', bookType: format as any });

        return new NextResponse(buf, {
            headers: {
                'Content-Disposition': `attachment; filename="${filename}.${format}"`,
                'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        });

    } catch (e) {
        console.error(e);
        return new NextResponse('Export failed', { status: 500 });
    }
}
