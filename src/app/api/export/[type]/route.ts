
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

  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    return new NextResponse('Forbidden: Insufficient permissions for data export', { status: 403 });
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

    const MAX_EXPORT_RECORDS = 5000;

    const sanitizeCellValue = (val: unknown): unknown => {
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (['=', '+', '-', '@', '\t', '\r'].some(char => trimmed.startsWith(char))) {
                return `'${val}`;
            }
        }
        return val;
    };

    const sanitizeRow = <T extends Record<string, any>>(row: T): T => {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(row)) {
            sanitized[key] = sanitizeCellValue(value);
        }
        return sanitized;
    };

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
                 orderBy: { createdAt: 'desc' },
                 take: MAX_EXPORT_RECORDS,
             });
             
             data = tickets.map((t: any) => sanitizeRow({
                 ID: t.ticketNumber || t.id.slice(0, 8),
                 Title: t.title,
                 Status: t.status,
                 Priority: t.priority,
                 Customer: t.customer?.name || 'N/A',
                 AssignedTo: t.assignedTo?.name || 'Unassigned',
                 Created: t.createdAt.toISOString().split('T')[0],
                 Due: t.dueDate ? t.dueDate.toISOString().split('T')[0] : '',
             }));

        } else if (type === 'parts') {
             const parts = await db.part.findMany({
                 where: {},
                 orderBy: { name: 'asc' },
                 take: MAX_EXPORT_RECORDS,
             });
             data = parts.map((p: any) => sanitizeRow({
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
                 orderBy: { createdAt: 'desc' },
                 take: MAX_EXPORT_RECORDS,
             });
             data = invoices.map((i: any) => sanitizeRow({
                 Number: i.invoiceNumber,
                 Customer: i.customer?.name || 'N/A',
                 Date: i.createdAt.toISOString().split('T')[0],
                 Total: Number(i.total),
                 Status: i.status || 'PAID',
                 PaymentMethod: i.paymentMethod
             }));
        } else if (type === 'pos-sales') {
              const sales = await db.pOSSale.findMany({
                  where: { ...dateFilter },
                  include: { customer: true },
                  orderBy: { createdAt: 'desc' },
                  take: MAX_EXPORT_RECORDS,
              });
              data = sales.map((s: any) => sanitizeRow({
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
