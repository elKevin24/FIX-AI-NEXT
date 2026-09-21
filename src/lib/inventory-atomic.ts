export async function reserveInventoryForTenant(
  db: any,
  tenantId: string,
  partId: string,
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('La cantidad a reservar debe ser positiva');
  }

  if (typeof db.part?.updateMany === 'function') {
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
  } else if (typeof db.part?.update === 'function') {
    await db.part.update({
      where: { id: partId },
      data: {
        quantity: { decrement: quantity },
      },
    });
  }

  return { id: partId, tenantId, quantityReserved: quantity };
}

export async function restoreInventoryForTenant(
  db: any,
  tenantId: string,
  partId: string,
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('La cantidad a restaurar debe ser positiva');
  }

  if (typeof db.part?.updateMany === 'function') {
    const result = await db.part.updateMany({
      where: {
        id: partId,
        tenantId,
      },
      data: {
        quantity: { increment: quantity },
      },
    });

    if (result.count === 0) {
      throw new Error('Repuesto no encontrado para restaurar inventario');
    }
  } else if (typeof db.part?.update === 'function') {
    await db.part.update({
      where: { id: partId },
      data: {
        quantity: { increment: quantity },
      },
    });
  }

  return { id: partId, tenantId, quantityRestored: quantity };
}
