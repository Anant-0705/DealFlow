export function lineRequiresStock(product: { isSubscription: boolean; category: { name: string } }) {
  return !product.isSubscription && product.category.name.toLowerCase() !== "services";
}

export function orderAlreadyPlanned(lines: Array<{
  allocations: unknown[];
  backorders: Array<{ qty: number; consolidatedAt: Date | null }>;
}>) {
  return lines.some((line) =>
    line.allocations.length > 0 ||
    line.backorders.some((backorder) => !backorder.consolidatedAt && backorder.qty > 0),
  );
}

export function fulfillmentStatusForLines(lines: Array<{
  qty: number;
  product: { isSubscription: boolean; category: { name: string } };
  allocations: Array<{ qty: number; shippedAt: Date | null }>;
  backorders: Array<{ qty: number; consolidatedAt: Date | null }>;
}>) {
  const stockLines = lines.filter((line) => lineRequiresStock(line.product));
  if (!stockLines.length) return "FULFILLED" as const;

  let shippedAny = false;
  let openBackorder = false;
  let allShipped = true;

  for (const line of stockLines) {
    const shippedQty = line.allocations
      .filter((allocation) => allocation.shippedAt)
      .reduce((sum, allocation) => sum + allocation.qty, 0);
    const openQty = line.backorders
      .filter((backorder) => !backorder.consolidatedAt && backorder.qty > 0)
      .reduce((sum, backorder) => sum + backorder.qty, 0);
    if (shippedQty > 0) shippedAny = true;
    if (openQty > 0) openBackorder = true;
    if (shippedQty < line.qty || openQty > 0) allShipped = false;
  }

  if (allShipped) return "FULFILLED" as const;
  if (shippedAny || openBackorder) return "PARTIAL" as const;
  return "PLANNED" as const;
}
