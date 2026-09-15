export async function reserveInventoryForTenant(
  db: any,
  tenantId: string,
  partId: string,
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('La cantidad a reservar debe ser positiva');
  }

  const result = await db.part.updateMany({
    where: {
      id: partId,
      tenantId,
      quantity: { gte: quantity },
    },
    data: {
      quantity: { decrement: quantity },
    },
  });

  if (result.count === 0) {
    throw new Error('Stock insuficiente');
  }

  return { id: partId, tenantId, quantityReserved: quantity };
}
