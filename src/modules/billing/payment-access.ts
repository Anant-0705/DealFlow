export type PaymentActor = {
  userId: number;
  role: string;
  customerId: number | null;
};

export function canPayInvoice(actor: PaymentActor, invoiceCustomerId: number) {
  if (actor.role === "FINANCE" || actor.role === "ADMIN") return true;
  return actor.role === "CUSTOMER" && actor.customerId === invoiceCustomerId;
}
