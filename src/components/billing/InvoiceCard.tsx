import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { invoiceRemainingPaise } from "@/modules/billing/invoice-balance";

export function InvoiceCard({ invoice }: { invoice: { code: string; kind: string; totalPaise: number; paidPaise: number; status: string; dueAt: Date; creditNotes?: Array<{ amountPaise: number }> } }) {
  return <Link className="invoice-card" href={`/app/invoices/${invoice.code}`}><div className="split"><strong>{invoice.code}</strong><StatusBadge status={invoice.status}/></div><span>{invoice.kind.replaceAll("_", " ")}</span><b>{formatMoney(invoiceRemainingPaise(invoice))} balance</b><small>Due {invoice.dueAt.toLocaleDateString("en-IN")}</small></Link>;
}
