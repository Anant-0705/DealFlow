import { allocateInventory, type AllocationRequest, type AllocationWarehouse, type StockSnapshot } from "@/modules/inventory/allocate";
import { evaluateRevision } from "@/modules/pricing/engine";
import type { EvaluationInput } from "@/modules/pricing/types";

export type CustomerImpact = { currentTotalPaise: number; proposedTotalPaise: number; savingsPaise: number };

export function computeCustomerImpact(currentTotalPaise: number, proposedTotalPaise: number): CustomerImpact {
  return { currentTotalPaise, proposedTotalPaise, savingsPaise: Math.max(0, currentTotalPaise - proposedTotalPaise) };
}

export type ImpactResult = {
  current: { totalPaise: number; taxPaise: number; marginPaise: number; marginBps: number; requiredLevel: string; reasons: string[]; stock: string; firstBillPaise: number };
  proposed: { totalPaise: number; taxPaise: number; marginPaise: number; marginBps: number; requiredLevel: string; reasons: string[]; stock: string; firstBillPaise: number };
  deltas: { totalPaise: number; marginPaise: number; firstBillPaise: number };
};

const stockLabel = (backorderQty: number, requestedQty: number) => backorderQty === 0 ? "Ships in full" : backorderQty === requestedQty ? "All backordered" : `Partial: ${backorderQty} backordered`;

export function computeImpact(input: {
  current: EvaluationInput;
  proposed: EvaluationInput;
  currentAllocationRequests: AllocationRequest[];
  proposedAllocationRequests: AllocationRequest[];
  stock: StockSnapshot[];
  warehouses: AllocationWarehouse[];
  currentFirstBillPaise: number;
  proposedFirstBillPaise: number;
}): ImpactResult {
  const current = evaluateRevision(input.current);
  const proposed = evaluateRevision(input.proposed);
  const currentPlan = allocateInventory(input.currentAllocationRequests, input.stock, input.warehouses);
  const proposedPlan = allocateInventory(input.proposedAllocationRequests, input.stock, input.warehouses);
  const stock = (requests: AllocationRequest[], plan: typeof currentPlan) => {
    const requestedQty = requests.filter((line) => line.requiresStock !== false).reduce((sum, line) => sum + line.qty, 0);
    const backorderQty = plan.lines.reduce((sum, line) => sum + line.backorderQty, 0);
    return stockLabel(backorderQty, requestedQty);
  };
  const describe = (evaluation: typeof current, firstBillPaise: number, stockOutcome: string) => ({ totalPaise: evaluation.totalPaise, taxPaise: evaluation.taxPaise, marginPaise: evaluation.marginPaise, marginBps: evaluation.marginBps, requiredLevel: evaluation.requiredLevel, reasons: evaluation.reasons, stock: stockOutcome, firstBillPaise });
  return {
    current: describe(current, input.currentFirstBillPaise, stock(input.currentAllocationRequests, currentPlan)),
    proposed: describe(proposed, input.proposedFirstBillPaise, stock(input.proposedAllocationRequests, proposedPlan)),
    deltas: { totalPaise: proposed.totalPaise - current.totalPaise, marginPaise: proposed.marginPaise - current.marginPaise, firstBillPaise: input.proposedFirstBillPaise - input.currentFirstBillPaise },
  };
}
