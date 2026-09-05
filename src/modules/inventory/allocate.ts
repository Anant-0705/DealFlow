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

export function allocateInventory(
  requests: AllocationRequest[],
  stock: StockSnapshot[],
  warehouses: AllocationWarehouse[],
): AllocationPlan {
  const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]));
  const remaining = new Map(
    stock.map((row) => [
      `${row.warehouseId}:${row.productId}:${row.variantId ?? "base"}`,
      Math.max(0, row.onHand - row.reserved),
    ]),
  );

  const lines = requests.map<LineAllocationPlan>((request) => {
    const description = `${request.description ?? `Product ${request.productId}`}${request.variantLabel ? ` (${request.variantLabel})` : ""}`;
    if (request.requiresStock === false) {
      return {
        lineId: request.lineId,
        productId: request.productId,
        variantId: request.variantId ?? null,
        description,
        allocations: [],
        backorderQty: 0,
        reasons: [`${description} ×${request.qty}: service or subscription line, no stock required.`],
      };
    }

    const candidates = warehouses
      .map((warehouse) => ({
        ...warehouse,
        available: remaining.get(`${warehouse.id}:${request.productId}:${request.variantId ?? "base"}`) ?? 0,
      }))
      .filter((warehouse) => warehouse.available > 0);

    const options = subsets(candidates).map((subset) => {
      let needed = request.qty;
      const allocations = [...subset]
        .sort((a, b) => b.available - a.available || a.id - b.id)
        .map((warehouse) => {
          const qty = Math.min(needed, warehouse.available);
          needed -= qty;
          return { warehouseId: warehouse.id, warehouseName: warehouse.name, qty };
        })
        .filter((allocation) => allocation.qty > 0);
      return {
        allocations,
        shipped: request.qty - needed,
        shipments: allocations.length,
        cost: allocations.reduce((sum, allocation) => sum + (warehouseMap.get(allocation.warehouseId)?.shippingCostWeightPaise ?? 0), 0),
        warehouseIds: allocations.map((allocation) => allocation.warehouseId).sort((a, b) => a - b),
      };
    });

    options.sort((a, b) =>
      b.shipped - a.shipped ||
      a.shipments - b.shipments ||
      a.cost - b.cost ||
      a.warehouseIds.join(",").localeCompare(b.warehouseIds.join(","), undefined, { numeric: true }),
    );
    const best = options[0] ?? { allocations: [], shipped: 0, shipments: 0, cost: 0, warehouseIds: [] };
    for (const allocation of best.allocations) {
      const key = `${allocation.warehouseId}:${request.productId}:${request.variantId ?? "base"}`;
      remaining.set(key, (remaining.get(key) ?? 0) - allocation.qty);
    }

    const backorderQty = request.qty - best.shipped;
    const availability = candidates.map((candidate) => `${candidate.name} ${candidate.available} available`).join(", ");
    const split = best.allocations.map((allocation) => `${allocation.warehouseName} ${allocation.qty}`).join(" + ");
    const outcome = best.shipped
      ? `ship ${split}${backorderQty ? `, backorder ${backorderQty}` : ""}`
      : `backorder all ${request.qty}`;
    const cost = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(best.cost / 100);
    const reason = `${description} ×${request.qty}: ${availability || "no stock available"} → ${outcome}. ${best.shipments <= 1 ? "Single shipment." : `Chosen: cheapest ${best.shipments}-shipment option (${cost}).`}`;
    return {
      lineId: request.lineId,
      productId: request.productId,
      variantId: request.variantId ?? null,
      description,
      allocations: best.allocations,
      backorderQty,
      reasons: [reason],
    };
  });

  const usedWarehouseIds = new Set(lines.flatMap((line) => line.allocations.map((allocation) => allocation.warehouseId)));
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
