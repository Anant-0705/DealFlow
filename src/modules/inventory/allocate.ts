export type AllocationRequest = {
  lineId?: number;
  productId: number;
  variantId?: number | null;
  description?: string;
  variantLabel?: string | null;
  qty: number;
  requiresStock?: boolean;
};

export type StockSnapshot = {
  warehouseId: number;
  productId: number;
  variantId?: number | null;
  onHand: number;
  reserved: number;
};

export type AllocationWarehouse = {
  id: number;
  name: string;
  shippingCostWeightPaise: number;
  replenishmentLeadDays?: number;
};

export type LineAllocationPlan = {
  lineId?: number;
  productId: number;
  variantId: number | null;
  description: string;
  allocations: Array<{ warehouseId: number; warehouseName: string; qty: number }>;
  backorderQty: number;
  reasons: string[];
};

export type AllocationPlan = {
  lines: LineAllocationPlan[];
  totalShipments: number;
  totalEstimatedCostPaise: number;
  reasons: string[];
};

function subsets<T>(values: T[]) {
  const result: T[][] = [];
  for (let mask = 1; mask < 1 << values.length; mask++) {
    result.push(values.filter((_, index) => Boolean(mask & (1 << index))));
  }
  return result;
}

function stockKey(warehouseId: number, productId: number, variantId?: number | null) {
  return `${warehouseId}:${productId}:${variantId ?? "base"}`;
}

function cloneRemaining(stock: StockSnapshot[]) {
  return new Map(
    stock.map((row) => [
      stockKey(row.warehouseId, row.productId, row.variantId),
      Math.max(0, row.onHand - row.reserved),
    ]),
  );
}

function fillLine(
  request: AllocationRequest,
  subset: AllocationWarehouse[],
  remaining: Map<string, number>,
) {
  let needed = request.qty;
  const ranked = [...subset]
    .map((warehouse) => ({
      ...warehouse,
      available: remaining.get(stockKey(warehouse.id, request.productId, request.variantId)) ?? 0,
    }))
    .filter((warehouse) => warehouse.available > 0)
    .sort((a, b) =>
      b.available - a.available ||
      a.shippingCostWeightPaise - b.shippingCostWeightPaise ||
      a.id - b.id,
    );
  const allocations = ranked
    .map((warehouse) => {
      const qty = Math.min(needed, warehouse.available);
      needed -= qty;
      return { warehouseId: warehouse.id, warehouseName: warehouse.name, qty };
    })
    .filter((allocation) => allocation.qty > 0);
  for (const allocation of allocations) {
    const key = stockKey(allocation.warehouseId, request.productId, request.variantId);
    remaining.set(key, (remaining.get(key) ?? 0) - allocation.qty);
  }
  return { allocations, shipped: request.qty - needed, backorderQty: needed };
}

function describeLine(
  request: AllocationRequest,
  warehouses: AllocationWarehouse[],
  stock: StockSnapshot[],
  allocations: Array<{ warehouseId: number; warehouseName: string; qty: number }>,
  backorderQty: number,
  orderShipments: number,
  orderCostPaise: number,
) {
  const description = `${request.description ?? `Product ${request.productId}`}${request.variantLabel ? ` (${request.variantLabel})` : ""}`;
  const availability = warehouses
    .map((warehouse) => {
      const row = stock.find((item) => item.warehouseId === warehouse.id && item.productId === request.productId && (item.variantId ?? null) === (request.variantId ?? null));
      const available = Math.max(0, (row?.onHand ?? 0) - (row?.reserved ?? 0));
      return available > 0 ? `${warehouse.name} ${available} available` : null;
    })
    .filter(Boolean)
    .join(", ");
  const split = allocations.map((allocation) => `${allocation.warehouseName} ${allocation.qty}`).join(" + ");
  const shipped = request.qty - backorderQty;
  const outcome = shipped ? `ship ${split}${backorderQty ? `, backorder ${backorderQty}` : ""}` : `backorder all ${request.qty}`;
  const cost = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(orderCostPaise / 100);
  const shipmentNote = orderShipments <= 1
    ? "Single shipment."
    : `Chosen: cheapest ${orderShipments}-shipment option for the order (${cost}).`;
  return `${description} ×${request.qty}: ${availability || "no stock available"} → ${outcome}. ${shipmentNote}`;
}

export function allocateInventory(
  requests: AllocationRequest[],
  stock: StockSnapshot[],
  warehouses: AllocationWarehouse[],
): AllocationPlan {
  const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]));
  const serviceLines: LineAllocationPlan[] = [];
  const stockRequests: AllocationRequest[] = [];

  for (const request of requests) {
    const description = `${request.description ?? `Product ${request.productId}`}${request.variantLabel ? ` (${request.variantLabel})` : ""}`;
    if (request.requiresStock === false) {
      serviceLines.push({
        lineId: request.lineId,
        productId: request.productId,
        variantId: request.variantId ?? null,
        description,
        allocations: [],
        backorderQty: 0,
        reasons: [`${description} ×${request.qty}: service or subscription line, no stock required.`],
      });
      continue;
    }
    stockRequests.push(request);
  }

  const emptyPlan = { allocations: [] as Array<{ warehouseId: number; warehouseName: string; qty: number }>, shipped: 0, backorderQty: 0 };
  const scored = (warehouses.length ? subsets(warehouses) : [[]]).map((subset) => {
    const remaining = cloneRemaining(stock);
    const filled = stockRequests.map((request) => ({ request, ...fillLine(request, subset, remaining) }));
    const usedWarehouseIds = [...new Set(filled.flatMap((line) => line.allocations.map((allocation) => allocation.warehouseId)))].sort((a, b) => a - b);
    const shipped = filled.reduce((sum, line) => sum + line.shipped, 0);
    const cost = usedWarehouseIds.reduce((sum, id) => sum + (warehouseMap.get(id)?.shippingCostWeightPaise ?? 0), 0);
    return { filled, shipped, shipments: usedWarehouseIds.length, cost, warehouseIds: usedWarehouseIds };
  });

  scored.sort((a, b) =>
    b.shipped - a.shipped ||
    a.shipments - b.shipments ||
    a.cost - b.cost ||
    a.warehouseIds.join(",").localeCompare(b.warehouseIds.join(","), undefined, { numeric: true }),
  );

  const best = scored[0] ?? { filled: stockRequests.map((request) => ({ request, ...emptyPlan })), shipped: 0, shipments: 0, cost: 0, warehouseIds: [] as number[] };
  const usedWarehouseIds = new Set(best.warehouseIds);
  const filledByRequest = new Map(best.filled.map((line) => [line.request, line]));
  const serviceByRequest = new Map<AllocationRequest, LineAllocationPlan>();
  let serviceIndex = 0;
  for (const request of requests) {
    if (request.requiresStock === false) serviceByRequest.set(request, serviceLines[serviceIndex++]);
  }
  const lines = requests.map((request) => {
    if (request.requiresStock === false) return serviceByRequest.get(request)!;
    const filled = filledByRequest.get(request) ?? { request, ...emptyPlan };
    const description = `${request.description ?? `Product ${request.productId}`}${request.variantLabel ? ` (${request.variantLabel})` : ""}`;
    return {
      lineId: request.lineId,
      productId: request.productId,
      variantId: request.variantId ?? null,
      description,
      allocations: filled.allocations,
      backorderQty: filled.backorderQty,
      reasons: [describeLine(request, warehouses, stock, filled.allocations, filled.backorderQty, best.shipments, best.cost)],
    };
  });

  return {
    lines,
    totalShipments: usedWarehouseIds.size,
    totalEstimatedCostPaise: [...usedWarehouseIds].reduce(
      (sum, id) => sum + (warehouseMap.get(id)?.shippingCostWeightPaise ?? 0),
      0,
    ),
    reasons: lines.flatMap((line) => line.reasons),
  };
}
