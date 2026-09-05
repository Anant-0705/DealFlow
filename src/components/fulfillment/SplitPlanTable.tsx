import { formatMoney } from "@/lib/money";
import type { AllocationPlan } from "@/modules/inventory/allocate";

export function SplitPlanTable({ plan }: { plan: AllocationPlan }) {
  return <><div className="table-scroll"><table><thead><tr><th>Order line</th><th>Warehouse split</th><th>Backorder</th></tr></thead><tbody>{plan.lines.map((line) => <tr key={`${line.lineId}-${line.productId}`}><td>{line.description}</td><td>{line.allocations.length ? line.allocations.map((row) => `${row.warehouseName} ×${row.qty}`).join(" + ") : "No reservation required"}</td><td>{line.backorderQty || "—"}</td></tr>)}</tbody></table></div><div className="plan-summary"><span>Distinct shipments <b>{plan.totalShipments}</b></span><span>Estimated shipping cost <b>{formatMoney(plan.totalEstimatedCostPaise)}</b></span></div><ul className="reason-list">{plan.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></>;
}
