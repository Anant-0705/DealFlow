import { dismissAlert, escalateToManager, nudgeRep } from "@/modules/health/actions";
import { SubmitButton } from "@/components/ui/submit-button";

export function AlertActions({ quoteId, kind }: { quoteId: number; kind: string }) {
  return <div className="health-actions">
    <details><summary>Nudge Rep</summary><form action={nudgeRep}><input type="hidden" name="quoteId" value={quoteId}/><textarea name="message" required minLength={3} maxLength={500} defaultValue="Please review this at-risk deal and record the next step."/><SubmitButton size="sm" pendingLabel="Sending…">Send nudge</SubmitButton></form></details>
    <details><summary>Escalate</summary><form action={escalateToManager}><input type="hidden" name="quoteId" value={quoteId}/><textarea name="message" required minLength={3} maxLength={500} defaultValue="Escalated for manager ownership because the deal is at risk."/><SubmitButton size="sm" variant="secondary" pendingLabel="Escalating…">Escalate</SubmitButton></form></details>
    <details><summary>Dismiss</summary><form action={dismissAlert}><input type="hidden" name="quoteId" value={quoteId}/><input type="hidden" name="kind" value={kind}/><textarea name="reason" required minLength={3} maxLength={500} placeholder="Why is this alert safe to hide for 7 days?"/><SubmitButton size="sm" variant="outline" pendingLabel="Dismissing…">Dismiss 7 days</SubmitButton></form></details>
  </div>;
}
