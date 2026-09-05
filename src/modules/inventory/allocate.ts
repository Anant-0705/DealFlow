export type AllocationRequest = { productId: number; variantId?: number | null; qty: number };
export type AllocationResult = { allocations: Array<{ warehouseId: number; qty: number }>; backorderQty: number; reasons: string[] };

// Phase 2 fills this engine; the Phase 1 schema and stock data already support it.
export function allocateInventory(_request: AllocationRequest): AllocationResult {
  return { allocations: [], backorderQty: _request.qty, reasons: ["Allocation becomes active in Phase 2."] };
}
