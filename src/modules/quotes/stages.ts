type QuoteStatuses = { approvalStatus: string; customerStatus: string; fulfillmentStatus: string; paymentStatus: string };

export function deriveStage(quote: QuoteStatuses) {
  if (quote.approvalStatus === "REJECTED") return "Rejected";
  if (quote.paymentStatus === "PAID") return "Invoiced / Paid";
  if (quote.fulfillmentStatus === "FULFILLED") return "Fulfilled";
  if (quote.customerStatus === "CONFIRMED") return "Confirmed";
  if (quote.customerStatus === "SENT" || quote.customerStatus === "NEGOTIATING") return "Sent / Negotiating";
  if (quote.approvalStatus === "APPROVED") return "Approved";
  if (quote.approvalStatus === "PENDING") return "Pending Approval";
  return "Draft";
}

export const pipelineStages = ["Draft", "Pending Approval", "Approved", "Sent / Negotiating", "Confirmed", "Fulfilled", "Invoiced / Paid", "Rejected"] as const;
