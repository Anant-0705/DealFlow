import Link from "next/link";
import { notFound } from "next/navigation";
import { approve, reject, returnForRevision } from "@/modules/approvals/actions";
import { getQuoteDetail } from "@/modules/quotes/queries";
import { requirePageRole } from "@/lib/auth";
import { APPROVER_ROLES } from "@/lib/roles";
import { formatMoney, formatPercent } from "@/lib/money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DocumentActions } from "@/components/print/DocumentActions";
import { buttonVariants } from "@/components/ui/button";

export default async function ApprovalReviewPage({ params }: { params: Promise<{ code: string }> }) {
  const session = await requirePageRole(APPROVER_ROLES);
  const { code } = await params;
  const quote = await getQuoteDetail(code);
  if (!quote?.currentRevision) notFound();
  const revision = quote.currentRevision;
  const expectedLevel = session.role === "FINANCE" ? "FINANCE" : "MANAGER";
  const activeStep = revision.approvalSteps.find(
    (step) =>
      step.level === expectedLevel &&
      step.status === "PENDING" &&
      revision.approvalSteps.filter((prior) => prior.sequence < step.sequence).every((prior) => prior.status === "APPROVED")
  );
  const totalQty = revision.lines.reduce((sum, line) => sum + line.qty, 0);
  const totalNetPaise = revision.lines.reduce((sum, line) => sum + line.netPaise, 0);

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <Link className="back-link" href="/app/approvals">← Approval inbox</Link>
          <div className="eyebrow">{quote.customer.name} · {quote.customer.tier} customer · Sales Rep: {quote.owner.name}</div>
          <h1>{quote.code} <span>v{revision.version}</span></h1>
          <p>{formatMoney(revision.totalPaise)} total · {formatMoney(revision.marginPaise)} margin ({formatPercent(revision.marginBps, 1)})</p>
        </div>
        <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <StatusBadge status={quote.approvalStatus}/>
          <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/app/quotations/${quote.code}`} target="_blank">
            Open full quotation ↗
          </Link>
          <DocumentActions printHref={`/app/print/quote/${quote.code}`} pdfHref={`/app/print/quote/${quote.code}/pdf`} />
        </div>
      </div>

      <div className="approval-grid">
        <div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Quotation Review</span>
                <h2>Quotation lines & policy detail</h2>
              </div>
              <span className="badge outline" style={{ fontSize: "11px" }}>
                {revision.lines.length} items
              </span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Line item</th>
                    <th>Qty</th>
                    <th>Unit list price</th>
                    <th>Discount given</th>
                    <th>Allowed discount</th>
                    <th>Over policy</th>
                    <th>Line net</th>
                  </tr>
                </thead>
                <tbody>
                  {revision.lines.map((line) => (
                    <tr className={line.excessBps ? "row-over" : ""} key={line.id}>
                      <td>
                        <strong>{line.description}</strong>
                        {line.variant && <small style={{ display: "block", color: "var(--muted)" }}>{line.variant.attributeValue}</small>}
                      </td>
                      <td>{line.qty}</td>
                      <td>{formatMoney(line.unitPricePaise)}</td>
                      <td>{formatPercent(line.effectiveDiscountBps, 1)}</td>
                      <td>{formatPercent(line.allowedDiscountBps, 1)}</td>
                      <td>{line.excessBps ? `${line.excessBps / 100} pts` : "OK"}</td>
                      <td><strong>{formatMoney(line.netPaise)}</strong></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700, borderTop: "2px solid var(--line, #e2d4c7)", background: "rgba(0,0,0,0.02)" }}>
                    <td>Total ({revision.lines.length} items)</td>
                    <td>{totalQty}</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>{formatMoney(totalNetPaise)}</td>
                  </tr>
                  <tr style={{ fontWeight: 600, color: "var(--muted)" }}>
                    <td colSpan={6} style={{ textAlign: "right" }}>Tax (GST):</td>
                    <td>{formatMoney(revision.taxPaise)}</td>
                  </tr>
                  <tr style={{ fontWeight: 800, fontSize: "14px", borderTop: "1px solid var(--line, #e2d4c7)", background: "rgba(0,0,0,0.03)" }}>
                    <td colSpan={6} style={{ textAlign: "right" }}>Quotation Total:</td>
                    <td>{formatMoney(revision.totalPaise)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>

        <aside>
          {activeStep ? (
            <form className="panel decision-form">
              <span className="eyebrow">Your decision</span>
              <h2>{activeStep.level === "MANAGER" ? "Sales Manager" : "Finance"} review</h2>
              <input type="hidden" name="stepId" value={activeStep.id}/>
              <label>
                Reason
                <textarea name="reason" required minLength={3} placeholder="Explain the decision for the audit trail"/>
              </label>
              <div className="decision-actions">
                <button className="button primary" formAction={approve}>Approve</button>
                <button className="button secondary" formAction={returnForRevision}>Return for revision</button>
                <button className="button danger" formAction={reject}>Reject</button>
              </div>
            </form>
          ) : (
            <div className="panel empty-note">There is no actionable {expectedLevel.toLowerCase()} step for this revision.</div>
          )}

          {revision.approvalSteps.length > 0 && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Governance Chain</span>
                  <h2 style={{ fontSize: "16px" }}>Approval steps</h2>
                </div>
              </div>
              <div style={{ display: "grid", gap: "10px" }}>
                {revision.approvalSteps.map((step) => (
                  <div
                    key={step.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "6px",
                      background: "rgba(0,0,0,0.02)",
                      border: "1px solid var(--line, #e2d4c7)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <strong style={{ fontSize: "13px" }}>
                        {step.level === "MANAGER" ? "1. Sales Manager" : "2. Finance"}
                      </strong>
                      <StatusBadge status={step.status} />
                    </div>
                    {step.actor && (
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                        By {step.actor.name}
                        {step.actedAt && ` · ${new Date(step.actedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}
                      </div>
                    )}
                    {step.reason && (
                      <div style={{ fontSize: "12px", marginTop: "4px", fontStyle: "italic", color: "var(--ink)" }}>
                        &ldquo;{step.reason}&rdquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Deal Summary</span>
                <h2 style={{ fontSize: "16px" }}>Commercial totals</h2>
              </div>
            </div>
            <dl style={{ display: "grid", gap: "8px", margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--muted)" }}>
                <dt>Customer</dt>
                <dd style={{ fontWeight: 600, color: "var(--ink)" }}>{quote.customer.name}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--muted)" }}>
                <dt>Customer tier</dt>
                <dd style={{ fontWeight: 600, color: "var(--ink)" }}>{quote.customer.tier}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--muted)" }}>
                <dt>Sales rep</dt>
                <dd style={{ fontWeight: 600, color: "var(--ink)" }}>{quote.owner.name}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--muted)", borderTop: "1px solid var(--line)", paddingTop: "8px" }}>
                <dt>Subtotal (list)</dt>
                <dd style={{ fontWeight: 600, color: "var(--ink)" }}>{formatMoney(revision.subtotalPaise)}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--muted)" }}>
                <dt>Total discounts</dt>
                <dd style={{ fontWeight: 600, color: "#b91c1c" }}>−{formatMoney(revision.discountPaise)}</dd>
              </div>
              {revision.orderDiscountBps > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--muted)" }}>
                  <dt>Order discount</dt>
                  <dd style={{ fontWeight: 600 }}>{formatPercent(revision.orderDiscountBps, 1)}</dd>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--muted)" }}>
                <dt>Taxable net</dt>
                <dd style={{ fontWeight: 600, color: "var(--ink)" }}>{formatMoney(totalNetPaise)}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--muted)" }}>
                <dt>Tax (GST)</dt>
                <dd style={{ fontWeight: 600, color: "var(--ink)" }}>{formatMoney(revision.taxPaise)}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 800, color: "var(--ink)", borderTop: "1px solid var(--line)", paddingTop: "8px", marginTop: "4px" }}>
                <dt>Total</dt>
                <dd>{formatMoney(revision.totalPaise)}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--muted)" }}>
                <dt>Gross margin</dt>
                <dd style={{ fontWeight: 700, color: "var(--ink)" }}>{formatMoney(revision.marginPaise)} ({formatPercent(revision.marginBps, 1)})</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
