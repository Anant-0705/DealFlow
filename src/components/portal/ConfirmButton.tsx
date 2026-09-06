import { confirmAsCustomer, reportUnauthorizedConfirm } from "@/modules/negotiation/actions";
import { CHANNEL_LABELS } from "@/modules/negotiation/on-behalf";
import type { ConfirmChannel } from "@/modules/negotiation/on-behalf";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

export function ConfirmButton({
  quoteCode,
  revisionId,
  approvalStatus,
  customerStatus,
  onBehalf,
  actorName,
  channel,
  note,
  canReport,
  alreadyReported,
  disputeOpen,
}: {
  quoteCode: string;
  revisionId: number;
  approvalStatus: string;
  customerStatus: string;
  onBehalf?: boolean;
  actorName?: string | null;
  channel?: ConfirmChannel | null;
  note?: string | null;
  canReport?: boolean;
  alreadyReported?: boolean;
  disputeOpen?: boolean;
}) {
  if (customerStatus === "CONFIRMED" && onBehalf) {
    const via = channel ? CHANNEL_LABELS[channel] : "an offline agreement";
    const who = actorName ?? "Your sales representative";
    return (
      <div className="confirm-stack">
        <Alert className="confirm-panel">
          <div>
            <AlertTitle>Confirmed on your behalf</AlertTitle>
            <AlertDescription>
              {who} confirmed this quotation for you via {via}.{note ? ` ${note}` : ""} This is not the same as you confirming it in the portal.
            </AlertDescription>
          </div>
        </Alert>
        {disputeOpen || alreadyReported ? (
          <Alert>
            <AlertTitle>We received your report</AlertTitle>
            <AlertDescription>A sales manager and finance have been asked to review this. Stock will not be reserved or shipped until they close that review.</AlertDescription>
          </Alert>
        ) : canReport ? (
          <Alert variant="destructive" className="dispute-panel">
            <div>
              <AlertTitle>Did not authorize this?</AlertTitle>
              <AlertDescription>Tell us what happened. We will pause reservation and shipping and notify your sales manager and finance.</AlertDescription>
            </div>
            <form action={reportUnauthorizedConfirm} className="dispute-form">
              <input type="hidden" name="quoteCode" value={quoteCode}/>
              <Textarea name="note" required minLength={8} maxLength={500} placeholder="I did not agree to this version because…"/>
              <SubmitButton variant="outline" pendingLabel="Sending…">I did not authorize this</SubmitButton>
            </form>
          </Alert>
        ) : null}
      </div>
    );
  }

  const disabled = approvalStatus !== "APPROVED" || customerStatus === "CONFIRMED";
  const explanation = customerStatus === "CONFIRMED"
    ? "You confirmed this quotation."
    : approvalStatus !== "APPROVED"
      ? "Your latest request is under review."
      : "Confirmation creates the order and billing records.";
  return (
    <Alert className="confirm-panel">
      <div>
        <AlertTitle>Ready to proceed?</AlertTitle>
        <AlertDescription>{explanation}</AlertDescription>
      </div>
      <form action={confirmAsCustomer}>
        <input type="hidden" name="quoteCode" value={quoteCode}/>
        <input type="hidden" name="revisionId" value={revisionId}/>
        <Button type="submit" disabled={disabled}>Confirm quotation</Button>
      </form>
    </Alert>
  );
}
