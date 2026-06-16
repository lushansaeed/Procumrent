import { db } from "@/lib/db";

export async function getStockLevel(itemId: string, locationId: string): Promise<number> {
  const stock = await db.stock.findUnique({ where: { itemId_locationId: { itemId, locationId } } });
  return stock?.quantity ?? 0;
}

export async function adjustStock(
  itemId: string,
  locationId: string,
  movementType: string,
  quantity: number,
  reference: string,
  referenceType: string,
  performedById: string,
  performedByName: string,
  reason?: string
): Promise<void> {
  const current = await getStockLevel(itemId, locationId);
  const isDeduction = ["STOCK_OUT", "TRANSFER_OUT", "ISSUE", "DAMAGE", "LOSS"].includes(movementType);
  const balanceAfter = isDeduction ? current - quantity : current + quantity;

  await db.stockMovement.create({
    data: {
      itemId,
      locationId,
      movementType,
      quantity,
      balanceBefore: current,
      balanceAfter,
      reference,
      referenceType,
      performedBy: performedById,
      performedByName,
      reason,
    },
  });

  await db.stock.upsert({
    where: { itemId_locationId: { itemId, locationId } },
    update: { quantity: balanceAfter },
    create: { itemId, locationId, quantity: balanceAfter },
  });
}
