import { confirmAsCustomer } from "@/modules/negotiation/actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ConfirmButton({ quoteCode, revisionId, approvalStatus, customerStatus }: { quoteCode: string; revisionId: number; approvalStatus: string; customerStatus: string }) {
  const disabled = approvalStatus !== "APPROVED" || customerStatus === "CONFIRMED";
  const explanation = customerStatus === "CONFIRMED" ? "Already confirmed." : approvalStatus !== "APPROVED" ? "Your latest request is under review." : "Confirmation creates the order and billing records.";
  return <Alert className="confirm-panel"><div><AlertTitle>Ready to proceed?</AlertTitle><AlertDescription>{explanation}</AlertDescription></div><form action={confirmAsCustomer}><input type="hidden" name="quoteCode" value={quoteCode}/><input type="hidden" name="revisionId" value={revisionId}/><Button disabled={disabled}>Confirm quotation</Button></form></Alert>;
}
