import type { Prisma } from "@/generated/prisma/client";
import { allocateInventory } from "./allocate";
import { orderAlreadyPlanned } from "./fulfillment-status";

export async function lockProductStock(db: Prisma.TransactionClient, productId: number) {
  await db.$queryRawUnsafe<Array<{ id: number }>>('SELECT "id" FROM "Stock" WHERE "productId" = $1 FOR UPDATE', productId);
}

export async function reserveSuggestedAllocations(db: Prisma.TransactionClient, orderId: number) {
  await db.$queryRawUnsafe<Array<{ id: number }>>('SELECT "id" FROM "Order" WHERE "id" = $1 FOR UPDATE', orderId);
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { lines: { include: { product: { include: { category: true } }, variant: true, allocations: true, backorders: true } } },
  });
  if (orderAlreadyPlanned(order.lines)) throw new Error("This order already has a fulfillment plan.");
  for (const productId of [...new Set(order.lines.map((line) => line.productId))]) await lockProductStock(db, productId);
  const [stock, warehouses] = await Promise.all([
    db.stock.findMany({ select: { warehouseId: true, productId: true, variantId: true, onHand: true, reserved: true } }),
    db.warehouse.findMany({ where: { active: true }, select: { id: true, name: true, shippingCostWeightPaise: true, replenishmentLeadDays: true } }),
  ]);
  const plan = allocateInventory(order.lines.map((line) => ({ lineId: line.id, productId: line.productId, variantId: line.variantId, description: line.product.name, variantLabel: line.variant?.attributeValue, qty: line.qty, requiresStock: !line.product.isSubscription && line.product.category.name.toLowerCase() !== "services" })), stock, warehouses);
  for (const line of plan.lines) {
    for (const allocation of line.allocations) {
      const row = await db.stock.findFirstOrThrow({ where: { warehouseId: allocation.warehouseId, productId: line.productId, variantId: line.variantId } });
      await db.stock.update({ where: { id: row.id }, data: { reserved: { increment: allocation.qty } } });
      await db.allocation.create({ data: { orderLineId: line.lineId!, warehouseId: allocation.warehouseId, qty: allocation.qty, reserved: true, reason: line.reasons[0] } });
    }
    if (line.backorderQty) {
      const receipt = await db.stockReceipt.findFirst({ where: { productId: line.productId, variantId: line.variantId, receivedAt: null, expectedAt: { gte: new Date() } }, orderBy: { expectedAt: "asc" } });
      await db.backorder.create({ data: { orderLineId: line.lineId!, qty: line.backorderQty, expectedAt: receipt?.expectedAt ?? null } });
    }
  }
  return plan;
}
