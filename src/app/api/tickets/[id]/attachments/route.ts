
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { put, del } from '@vercel/blob';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const ticketId = resolvedParams.id;
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validation
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Basic type check, can be expanded
    if (!file.type.startsWith('image/') && !file.type.startsWith('application/') && !file.type.startsWith('text/')) {
        // Strict allow list is better
        if (!ALLOWED_TYPES.includes(file.type)) {
             return NextResponse.json({ error: 'File type not supported' }, { status: 400 });
        }
    }

    // Upload to Vercel Blob
    const blob = await put(`tickets/${session.user.tenantId}/${ticketId}/${file.name}`, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Save to DB
    const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);
    const attachment = await tenantDb.ticketAttachment.create({
      data: {
        ticketId,
        filename: file.name,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: blob.url,
        uploadedById: session.user.id,
      },
      include: {
        uploadedBy: {
          select: { name: true, email: true }
        }
      }
    });

    return NextResponse.json(attachment);

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { attachmentId } = await request.json();
        if (!attachmentId) {
            return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 });
        }

        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);
        
        // Verify ownership/tenant
        const attachment = await tenantDb.ticketAttachment.findUnique({
            where: { id: attachmentId },
            include: { ticket: true }
        });

        if (!attachment) {
            return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
        }

        // Security check: ensure attachment belongs to a ticket in the tenant
        // (getTenantPrisma implicitly handles this if we query correctly, but findUnique might bypass if not careful with some prisma versions/setups, 
        // though our lib usually uses middleware/extensions. Explicit check is safer).
        // Since we are using getTenantPrisma, it SHOULD throw or return null if not in tenant, depending on implementation.
        // But to be sure:
        if (attachment.ticket.tenantId !== session.user.tenantId) {
             return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Delete from Blob
        if (attachment.url) {
            try {
                await del(attachment.url, {
                    token: process.env.BLOB_READ_WRITE_TOKEN
                });
            } catch (blobError) {
                console.error('Blob delete error:', blobError);
                // Continue to delete from DB even if blob fails (avoid zombie records)
            }
        }

        // Delete from DB
        await tenantDb.ticketAttachment.delete({
            where: { id: attachmentId }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
