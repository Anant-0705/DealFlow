import { routeRevision } from "../approvals/route";
import type { EvaluationInput, EvaluationResult } from "./types";

const roundDiv = (numerator: number, denominator: number) =>
  Math.floor((numerator + denominator / 2) / denominator);
const pct = (bps: number) => `${Number((bps / 100).toFixed(2))}%`;
const pts = (bps: number) => `${Number((bps / 100).toFixed(2))} pts`;
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export function evaluateRevision(input: EvaluationInput): EvaluationResult {
  const tierCeilingBps = input.policy[`tierCeiling${input.customerTier[0]}${input.customerTier.slice(1).toLowerCase()}Bps` as keyof EvaluationInput["policy"]] as number;
  const lines = input.lines.map((line) => {
    const basePaise = line.qty * line.unitPricePaise;
    const remainingBps = roundDiv((10_000 - line.lineDiscountBps) * (10_000 - input.orderDiscountBps), 10_000);
    const effectiveDiscountBps = 10_000 - remainingBps;
    const allowedDiscountBps = Math.min(tierCeilingBps, line.categoryCeilingBps);
    const excessBps = Math.max(0, effectiveDiscountBps - allowedDiscountBps);
    const excessValuePaise = roundDiv(basePaise * excessBps, 10_000);
    const netPaise = roundDiv(basePaise * (10_000 - effectiveDiscountBps), 10_000);
    const taxPaise = roundDiv(netPaise * line.taxBps, 10_000);
    return {
      ...line,
      basePaise,
      effectiveDiscountBps,
      allowedDiscountBps,
      excessBps,
      excessValuePaise,
      netPaise,
      taxPaise,
      costPaise: line.qty * line.unitCostPaise,
    };
  });
  const subtotalPaise = lines.reduce((sum, line) => sum + line.basePaise, 0);
  const netRevenuePaise = lines.reduce((sum, line) => sum + line.netPaise, 0);
  const taxPaise = lines.reduce((sum, line) => sum + line.taxPaise, 0);
  const costPaise = lines.reduce((sum, line) => sum + line.costPaise, 0);
  const discountPaise = subtotalPaise - netRevenuePaise;
  const totalPaise = netRevenuePaise + taxPaise;
  const marginPaise = netRevenuePaise - costPaise;
  const marginBps = netRevenuePaise ? roundDiv(marginPaise * 10_000, netRevenuePaise) : 0;
  const maxLineExcessBps = lines.reduce((max, line) => Math.max(max, line.excessBps), 0);
  const excessValuePaise = lines.reduce((sum, line) => sum + line.excessValuePaise, 0);
  const blendedExcessBps = subtotalPaise ? roundDiv(excessValuePaise * 10_000, subtotalPaise) : 0;
  const requiredLevel = routeRevision({ maxLineExcessBps, blendedExcessBps, excessValuePaise }, input.policy);
  const detailReasons = lines.map((line) => line.excessBps > 0
    ? `${line.description}: ${pct(line.effectiveDiscountBps)} given, ${pct(line.allowedDiscountBps)} allowed (${line.categoryName} ceiling) → ${pts(line.excessBps)} over.`
    : `${line.description}: ${pct(line.effectiveDiscountBps)} given, ${pct(line.allowedDiscountBps)} allowed → OK.`);
  const reasons: string[] = [];
  for (const line of lines.filter((item) => item.excessBps > 0)) {
    const shortName = line.description.replace(/^Onsite\s+/i, "");
    reasons.push(`${shortName} is ${pts(line.excessBps)} over the ${pct(line.allowedDiscountBps)} ${line.categoryName} ceiling → Manager approval required.`);
  }
  if (requiredLevel === "FINANCE") {
    if (maxLineExcessBps >= input.policy.financeLineExcessBps) reasons.push(`Max line excess ${pts(maxLineExcessBps)} ≥ ${pts(input.policy.financeLineExcessBps)} → Finance approval required.`);
    if (blendedExcessBps >= input.policy.financeBlendedExcessBps) reasons.push(`Blended excess ${pct(blendedExcessBps)} ≥ ${pct(input.policy.financeBlendedExcessBps)} → Finance approval required.`);
    if (excessValuePaise >= input.policy.financeExcessValuePaise) reasons.push(`Excess discount value ${money(excessValuePaise)} ≥ ${money(input.policy.financeExcessValuePaise)} → Finance approval required.`);
  }
  if (requiredLevel === "NONE") reasons.push(lines.length ? "All lines within tier and category ceilings → auto-approved." : "No quote lines yet → no approval required.");
  reasons.push(`Requires: ${requiredLevel === "FINANCE" ? "Sales Manager → Finance" : requiredLevel === "MANAGER" ? "Sales Manager" : "No approval"}.`);
  return { lines, subtotalPaise, discountPaise, taxPaise, totalPaise, costPaise, marginPaise, marginBps, maxLineExcessBps, blendedExcessBps, excessValuePaise, requiredLevel, reasons, detailReasons };
}
