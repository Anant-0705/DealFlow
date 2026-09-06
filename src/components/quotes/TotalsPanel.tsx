import type { EvaluationResult } from "@/modules/pricing/types";
import { formatMoney, formatPercent } from "@/lib/money";

export function TotalsPanel({
  evaluation,
  customerName,
  customerTier,
  listSubtotalPaise = evaluation.subtotalPaise,
  tierSavingsPaise = 0,
  lineDiscountPaise = evaluation.discountPaise,
  orderDiscountPaise = 0,
}: {
  evaluation: EvaluationResult;
  customerName?: string;
  customerTier?: string;
  listSubtotalPaise?: number;
  tierSavingsPaise?: number;
  lineDiscountPaise?: number;
  orderDiscountPaise?: number;
}) {
  const width = Math.max(0, Math.min(100, evaluation.marginBps / 100));
  const taxablePaise = evaluation.totalPaise - evaluation.taxPaise;
  return (
    <section className="panel totals-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Commercials</span>
          <h2>Quote totals</h2>
          {customerName && (
            <p style={{ margin: "3px 0 0", color: "var(--muted, #725a4e)", fontSize: "12px", fontWeight: 500 }}>
              Customer: <strong>{customerName}</strong>{customerTier ? ` (${customerTier} tier)` : ""}
            </p>
          )}
        </div>
        <span className="badge info">Live</span>
      </div>
      <dl>
        <div>
          <dt>Subtotal (list)</dt>
          <dd>{formatMoney(listSubtotalPaise)}</dd>
        </div>
        {tierSavingsPaise > 0 && (
          <div>
            <dt>Tier price adjustment</dt>
            <dd className="positive">−{formatMoney(tierSavingsPaise)}</dd>
          </div>
        )}
        <div>
          <dt>Line discounts</dt>
          <dd>−{formatMoney(lineDiscountPaise)}</dd>
        </div>
        <div>
          <dt>Order discount</dt>
          <dd>−{formatMoney(orderDiscountPaise)}</dd>
        </div>
        <div>
          <dt>Taxable amount</dt>
          <dd>{formatMoney(taxablePaise)}</dd>
        </div>
        <div>
          <dt>Tax</dt>
          <dd>{formatMoney(evaluation.taxPaise)}</dd>
        </div>
        <div className="total">
          <dt>Total</dt>
          <dd>{formatMoney(evaluation.totalPaise)}</dd>
        </div>
      </dl>
      <div className="margin-box">
        <div className="split">
          <span>Margin</span>
          <strong>{formatMoney(evaluation.marginPaise)} · {formatPercent(evaluation.marginBps, 1)}</strong>
        </div>
        <div className="margin-track">
          <span style={{ width: `${width}%` }} />
        </div>
        <small>Net revenue less product cost, excluding tax</small>
      </div>
    </section>
  );
}
