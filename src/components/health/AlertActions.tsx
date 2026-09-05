import { dismissAlert, escalateToManager, nudgeRep } from "@/modules/health/actions";
import { scheduleStockReceipt } from "@/modules/inventory/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ScheduleReceiptDraft } from "@/modules/health/queries";

export function AlertActions({ quoteId, kind, scheduleReceipt, canSchedule }: { quoteId: number; kind: string; scheduleReceipt?: ScheduleReceiptDraft; canSchedule: boolean }) {
  return <div className="health-actions">
    {kind === "DELIVERY_SLIPPAGE" && canSchedule && scheduleReceipt && (
      <details>
        <summary>Schedule inbound</summary>
        <form action={scheduleStockReceipt}>
          <input type="hidden" name="warehouseId" value={scheduleReceipt.warehouseId}/>
          <input type="hidden" name="productId" value={scheduleReceipt.productId}/>
          <input type="hidden" name="variantId" value={scheduleReceipt.variantId ?? ""}/>
          <p className="muted">Creates an expected receipt so slippage can clear when inbound covers the promise.</p>
          <label>Qty<input name="qty" type="number" min="1" defaultValue={scheduleReceipt.qty} required/></label>
          <label>Expected<input name="expectedAt" type="date" defaultValue={scheduleReceipt.expectedAt} required/></label>
          <SubmitButton size="sm" pendingLabel="Scheduling…">Schedule receipt</SubmitButton>
        </form>
      </details>
    )}
    <details><summary>Nudge Rep</summary><form action={nudgeRep}><input type="hidden" name="quoteId" value={quoteId}/><textarea name="message" required minLength={3} maxLength={500} defaultValue="Please review this at-risk deal and record the next step."/><SubmitButton size="sm" pendingLabel="Sending…">Send nudge</SubmitButton></form></details>
    <details><summary>Escalate</summary><form action={escalateToManager}><input type="hidden" name="quoteId" value={quoteId}/><textarea name="message" required minLength={3} maxLength={500} defaultValue="Escalated for manager ownership because the deal is at risk."/><SubmitButton size="sm" variant="secondary" pendingLabel="Escalating…">Escalate</SubmitButton></form></details>
    <details><summary>Dismiss</summary><form action={dismissAlert}><input type="hidden" name="quoteId" value={quoteId}/><input type="hidden" name="kind" value={kind}/><textarea name="reason" required minLength={3} maxLength={500} placeholder="Why is this alert safe to hide for 7 days?"/><SubmitButton size="sm" variant="outline" pendingLabel="Dismissing…">Dismiss 7 days</SubmitButton></form></details>
  </div>;
}
