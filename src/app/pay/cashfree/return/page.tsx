import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { settleCashfreeOrderForActor } from "@/modules/billing/gateway";

export default async function CashfreeReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const session = await requireSession();
  const { order_id: orderId } = await searchParams;
  if (!orderId) redirect(session.role === "CUSTOMER" ? "/portal" : "/app/invoices");
  const result = await settleCashfreeOrderForActor(orderId, session);
  const invoiceCode = result.invoiceCode ?? "";
  const portal = session.role === "CUSTOMER";
  const base = portal ? `/portal/invoices/${invoiceCode}` : `/app/invoices/${invoiceCode}`;
  if (!result.ok) redirect(`${base}?error=${encodeURIComponent(result.message)}`);
  redirect(`${base}?notice=${encodeURIComponent(result.duplicate ? "Payment already recorded" : "Cashfree payment recorded")}`);
}
