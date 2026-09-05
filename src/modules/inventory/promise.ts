import type { AllocationPlan, AllocationWarehouse } from "./allocate";

const DAY_MS = 86_400_000;

export type PromiseReceipt = {
  productId: number;
  variantId?: number | null;
  qty: number;
  expectedAt: Date;
  receivedAt?: Date | null;
};

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function sameSku(productId: number, variantId: number | null, receipt: PromiseReceipt) {
  return receipt.productId === productId && (receipt.variantId ?? null) === variantId;
}

export function coverBackorderAt(input: {
  productId: number;
  variantId: number | null;
  backorderQty: number;
  confirmedAt: Date;
  warehouses: AllocationWarehouse[];
  receipts: PromiseReceipt[];
}) {
  let remaining = input.backorderQty;
  let latest = input.confirmedAt;
  const inbound = input.receipts
    .filter((receipt) => !receipt.receivedAt && sameSku(input.productId, input.variantId, receipt) && receipt.expectedAt.getTime() >= input.confirmedAt.getTime())
    .sort((a, b) => a.expectedAt.getTime() - b.expectedAt.getTime());
  for (const receipt of inbound) {
    remaining -= receipt.qty;
    if (receipt.expectedAt > latest) latest = receipt.expectedAt;
    if (remaining <= 0) return latest;
  }
  const leadDays = input.warehouses.reduce((min, warehouse) => Math.min(min, warehouse.replenishmentLeadDays ?? Number.POSITIVE_INFINITY), Number.POSITIVE_INFINITY);
  const wait = Number.isFinite(leadDays) ? leadDays : 0;
  return addDays(latest, remaining > 0 ? wait : 0);
}

export function promisedDeliveryDate(input: {
  confirmedAt: Date;
  plan: AllocationPlan;
  warehouses: AllocationWarehouse[];
  receipts: PromiseReceipt[];
}) {
  let latest = input.confirmedAt;
  for (const line of input.plan.lines) {
    if (!line.backorderQty) continue;
    const date = coverBackorderAt({
      productId: line.productId,
      variantId: line.variantId,
      backorderQty: line.backorderQty,
      confirmedAt: input.confirmedAt,
      warehouses: input.warehouses,
      receipts: input.receipts,
    });
    if (date > latest) latest = date;
  }
  return latest;
}
