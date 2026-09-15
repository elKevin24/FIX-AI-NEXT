import { getTenantPrisma } from "@/lib/tenant-prisma";

export interface ReceivePurchaseOrderInput {
    orderId: string;
    tenantId: string;
    userId: string;
}

export interface ReceivePurchaseOrderResult {
    success: boolean;
    message: string;
    receivedItemsCount: number;
}

/**
 * Caso de Uso para la recepcion de ordenes de compra e incremento
 * transaccional y atomico de stock con actualizacion de costos.
 */
export class ReceivePurchaseOrderUseCase {
    static async execute({ orderId, tenantId, userId }: ReceivePurchaseOrderInput): Promise<ReceivePurchaseOrderResult> {
        if (!orderId || typeof orderId !== "string") {
            throw new Error("ID de orden requerido");
        }

        const db = getTenantPrisma(tenantId, userId);

        return await db.$transaction(async (tx: any) => {
            const order = await tx.purchaseOrder.findUnique({
                where: { id: orderId },
                include: { items: true },
            });

            if (!order) {
                throw new Error("Orden no encontrada");
            }
            if (order.tenantId !== tenantId) {
                throw new Error("No autorizado");
            }
            if (order.status !== "PENDING") {
                throw new Error("La orden no está en estado Pendiente");
            }

            // Incrementar stock y actualizar costo ultimo de cada repuesto
            for (const item of order.items) {
                await tx.part.update({
                    where: { id: item.partId },
                    data: {
                        quantity: { increment: item.quantity },
                        cost: item.unitCost,
                        updatedById: userId,
                    },
                });
            }

            // Marcar orden como recibida
            await tx.purchaseOrder.update({
                where: { id: orderId },
                data: {
                    status: "RECEIVED",
                    receivedDate: new Date(),
                    updatedById: userId,
                },
            });

            // Registrar en auditoria
            await tx.auditLog.create({
                data: {
                    action: "PURCHASE_ORDER_RECEIVED",
                    module: "INVENTORY",
                    details: JSON.stringify({
                        orderId,
                        supplier: order.supplier,
                        itemsCount: order.items.length,
                    }),
                    userId,
                    tenantId,
                    entityType: "PurchaseOrder",
                    entityId: orderId,
                },
            });

            return {
                success: true,
                message: "Orden recibida e inventario actualizado",
                receivedItemsCount: order.items.length,
            };
        });
    }
}

