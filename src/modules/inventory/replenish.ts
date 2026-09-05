const DAY_MS = 86_400_000;

export type ReplenishmentStock = {
  warehouseId: number;
  productId: number;
  variantId?: number | null;
  onHand: number;
  reserved: number;
  reorderPoint: number;
  reorderQty: number;
  maxOnHand: number;
  warehouse: { name: string; replenishmentLeadDays: number };
  product: { name: string };
  variant?: { attributeValue: string } | null;
};

export type ReplenishmentNeed = {
  warehouseId: number;
  productId: number;
  variantId: number | null;
  warehouseName: string;
  productName: string;
  available: number;
  reorderPoint: number;
  qty: number;
  expectedAt: Date;
  reason: string;
};

export function replenishmentNeed(row: ReplenishmentStock, now = new Date()): ReplenishmentNeed | null {
  if (row.reorderPoint <= 0 || row.reorderQty <= 0) return null;
  const available = Math.max(0, row.onHand - row.reserved);
  if (available > row.reorderPoint) return null;
  let qty = row.reorderQty;
  if (row.maxOnHand > 0) qty = Math.min(qty, Math.max(0, row.maxOnHand - available));
  if (qty <= 0) return null;
  const expectedAt = new Date(now.getTime() + row.warehouse.replenishmentLeadDays * DAY_MS);
  const label = row.variant?.attributeValue ? `${row.product.name} (${row.variant.attributeValue})` : row.product.name;
  return {
    warehouseId: row.warehouseId,
    productId: row.productId,
    variantId: row.variantId ?? null,
    warehouseName: row.warehouse.name,
    productName: label,
    available,
    reorderPoint: row.reorderPoint,
    qty,
    expectedAt,
    reason: `${row.warehouse.name} has ${available} available ${label}, at or below reorder point ${row.reorderPoint}. Schedule ${qty} due in ${row.warehouse.replenishmentLeadDays} day${row.warehouse.replenishmentLeadDays === 1 ? "" : "s"}.`,
  };
}

export function replenishmentNeeds(rows: ReplenishmentStock[], now = new Date()) {
  return rows.map((row) => replenishmentNeed(row, now)).filter((row): row is ReplenishmentNeed => row !== null);
}
