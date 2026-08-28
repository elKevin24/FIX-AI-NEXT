'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';

// ============================================================================
// PURCHASE ORDER ACTIONS
// ============================================================================

import { redirect } from 'next/navigation';

// ...

export async function createPurchaseOrder(formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { success: false, message: 'Permiso denegado' };
    }

    const supplier = formData.get('supplier') as string;
    
    if (!supplier) {
        return { success: false, message: 'El proveedor es requerido' };
    }

    let po;

    try {
        const db = getTenantPrisma(session.user.tenantId, session.user.id);

        po = await db.purchaseOrder.create({
            data: {
                supplier,
                status: 'PENDING',
                tenantId: session.user.tenantId,
                createdById: session.user.id,
                updatedById: session.user.id,
            }
        });
        
    } catch (error) {
        console.error('Failed to create purchase order:', error);
        return { success: false, message: 'Error al crear la orden de compra' };
    }

    revalidatePath('/dashboard/inventory/purchases');
    redirect(`/dashboard/inventory/purchases/${po.id}`);
}

export async function addPurchaseItem(orderId: string, partId: string, quantity: number, unitCost: number) {
     const session = await auth();
     if (!session?.user?.tenantId) return { success: false, message: 'No autorizado' };
     if (session.user.role !== 'ADMIN') return { success: false, message: 'Permiso denegado' };

     if (quantity <= 0 || unitCost < 0) return { success: false, message: 'Cantidad o costo inválidos' };

     try {
         const db = getTenantPrisma(session.user.tenantId, session.user.id);

         // Verify order is PENDING
         const order = await db.purchaseOrder.findUnique({ where: { id: orderId } });
         if (!order || order.status !== 'PENDING') {
             return { success: false, message: 'La orden no existe o ya no es editable' };
         }

         await db.purchaseItem.create({
             data: {
                 purchaseOrderId: orderId,
                 partId,
                 quantity,
                 unitCost,
             }
         });

         // Update updatedAt timestamp
         await db.purchaseOrder.update({
             where: { id: orderId },
             data: { updatedById: session.user.id }
         });

         revalidatePath(`/dashboard/inventory/purchases/${orderId}`);
         return { success: true };

     } catch (error) {
         console.error(error);
         return { success: false, message: 'Error al agregar item' };
     }
}
import { ReceivePurchaseOrderUseCase } from '@/use-cases/inventory/ReceivePurchaseOrderUseCase';

export async function receivePurchaseOrder(orderId: string) {
     const session = await auth();
     if (!session?.user?.tenantId) return { success: false, message: 'No autorizado' };
     if (session.user.role !== 'ADMIN') return { success: false, message: 'Permiso denegado' };

     try {
         const result = await ReceivePurchaseOrderUseCase.execute({
             orderId,
             tenantId: session.user.tenantId,
             userId: session.user.id,
         });

         revalidatePath(`/dashboard/inventory/purchases/${orderId}`);
         revalidatePath('/dashboard/parts');
         return result;
     } catch (error: any) {
         console.error('Error receiving order:', error);
         return { success: false, message: error.message || 'Error al procesar la recepción' };
     }
}
