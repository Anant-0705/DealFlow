import { formatMoney, formatPercent } from "@/lib/money";
import { BeforeAfter } from "@/components/shared/BeforeAfter";

type ImpactSide = { totalPaise: number; taxPaise?: number; marginPaise?: number; marginBps?: number; requiredLevel?: string; stock?: string; firstBillPaise?: number; reasons?: unknown };

export function ImpactPreview({ current, proposed, customer = false }: { current: ImpactSide; proposed: ImpactSide; customer?: boolean }) {
  const reasons = Array.isArray(proposed.reasons) ? proposed.reasons.filter((reason): reason is string => typeof reason === "string") : [];
  return <section className="impact-preview"><div className="eyebrow">Impact preview · updates before saving</div><BeforeAfter before={formatMoney(current.totalPaise)} after={formatMoney(proposed.totalPaise)}/>{!customer && <div className="impact-grid"><span>Tax <b>{formatMoney(current.taxPaise ?? 0)} → {formatMoney(proposed.taxPaise ?? 0)}</b></span><span>Margin <b>{formatMoney(current.marginPaise ?? 0)} ({formatPercent(current.marginBps ?? 0, 1)}) → {formatMoney(proposed.marginPaise ?? 0)} ({formatPercent(proposed.marginBps ?? 0, 1)})</b></span><span>Approval <b>{current.requiredLevel ?? "NONE"} → {proposed.requiredLevel ?? "NONE"}</b></span>{proposed.stock && <span>Stock <b>{current.stock ?? "Not checked"} → {proposed.stock}</b></span>}{proposed.firstBillPaise !== undefined && <span>First recurring bill <b>{formatMoney(current.firstBillPaise ?? 0)} → {formatMoney(proposed.firstBillPaise)}</b></span>}{reasons.slice(0, 2).map((reason) => <small key={reason}>{reason}</small>)}</div>}{customer && <p className="savings">You save {formatMoney(Math.max(0, current.totalPaise - proposed.totalPaise))}</p>}</section>;
}
