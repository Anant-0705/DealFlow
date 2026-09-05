import "server-only";
import { prisma } from "@/lib/prisma";
import { allocateInventory } from "./allocate";

export const listWarehouses = () => prisma.warehouse.findMany({ include: { stock: { include: { product: true, variant: true } } }, orderBy: { name: "asc" } });

export async function getStockSnapshot() {
  const warehouses = await prisma.warehouse.findMany({
    where: { active: true },
    include: { stock: { include: { product: true, variant: true } } },
    orderBy: { name: "asc" },
  });
  return warehouses.flatMap((warehouse) => warehouse.stock.map((row) => ({
    ...row,
    warehouse,
    available: Math.max(0, row.onHand - row.reserved),
  })));
}

function planFor(order: Awaited<ReturnType<typeof loadOrderForPlan>>, stock: Awaited<ReturnType<typeof loadPlanStock>>, warehouses: Awaited<ReturnType<typeof loadPlanWarehouses>>) {
  if (!order) return null;
  return allocateInventory(
    order.lines.map((line) => ({
      lineId: line.id,
      productId: line.productId,
      variantId: line.variantId,
      description: line.product.name,
      variantLabel: line.variant?.attributeValue,
      qty: line.qty,
      requiresStock: !line.product.isSubscription && line.product.category.name.toLowerCase() !== "services",
    })),
    stock,
    warehouses,
  );
}

const loadPlanWarehouses = () => prisma.warehouse.findMany({ where: { active: true }, select: { id: true, name: true, shippingCostWeightPaise: true, replenishmentLeadDays: true } });
const loadPlanStock = () => prisma.stock.findMany({ select: { warehouseId: true, productId: true, variantId: true, onHand: true, reserved: true } });
const loadOrderForPlan = (code: string) => prisma.order.findUnique({ where: { code }, include: { quote: { include: { customer: true } }, lines: { include: { product: { include: { category: true } }, variant: true, allocations: { include: { warehouse: true } }, backorders: true } } } });

export async function listFulfillmentOrders() {
  return prisma.order.findMany({
    where: { quote: { fulfillmentStatus: { in: ["PLANNED", "PARTIAL"] } } },
    include: { quote: { include: { customer: true } }, lines: { include: { allocations: { include: { warehouse: true } }, backorders: true } } },
    orderBy: { confirmedAt: "desc" },
  });
}

export async function getFulfillmentOrder(code: string) {
  const [order, stock, warehouses] = await Promise.all([loadOrderForPlan(code), loadPlanStock(), loadPlanWarehouses()]);
  if (!order) return null;
  return { order, plan: planFor(order, stock, warehouses), stock, warehouses };
}

export async function getQuoteFulfillmentPreview(quoteId: number) {
  const [quote, stock, warehouses] = await Promise.all([
    prisma.quote.findUnique({ where: { id: quoteId }, include: { currentRevision: { include: { lines: { include: { product: { include: { category: true } }, variant: true } } } } } }),
    loadPlanStock(),
    loadPlanWarehouses(),
  ]);
  if (!quote?.currentRevision) return null;
  return allocateInventory(quote.currentRevision.lines.map((line) => ({ lineId: line.id, productId: line.productId, variantId: line.variantId, description: line.product.name, variantLabel: line.variant?.attributeValue, qty: line.qty, requiresStock: !line.product.isSubscription && line.product.category.name.toLowerCase() !== "services" })), stock, warehouses);
}
