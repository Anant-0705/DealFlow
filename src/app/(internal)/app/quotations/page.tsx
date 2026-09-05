import Link from "next/link";
import { FilePlus2, Kanban, SlidersHorizontal } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { listQuotes } from "@/modules/quotes/queries";
import { deriveStage } from "@/modules/quotes/stages";
import { formatMoney } from "@/lib/money";
import { requireInternal } from "@/lib/auth";
import { hasRole, QUOTE_EDITOR_ROLES } from "@/lib/roles";
import { buttonVariants } from "@/components/ui/button";

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const [session, query] = await Promise.all([requireInternal(), searchParams]);
  const quotes = await listQuotes(session.role === "REP" ? session.userId : undefined);
  const canCreate = hasRole(session.role, QUOTE_EDITOR_ROLES);
  const filtered = query.status === "open" ? quotes.filter((quote) => ["DRAFT", "SENT", "NEGOTIATING"].includes(quote.customerStatus) && quote.approvalStatus !== "REJECTED") : query.status === "pending" ? quotes.filter((quote) => quote.approvalStatus === "PENDING") : quotes;
  const rows = filtered.map((quote) => ({ id: quote.id, href: `/app/quotations/${quote.code}`, code: quote.code, customer: quote.customer.name, amount: formatMoney(quote.currentRevision?.totalPaise ?? 0), stage: deriveStage(quote), risk: quote.currentRevision?.requiredLevel ?? "NONE", revision: `v${quote.currentRevision?.version ?? 1}`, owner: quote.owner.name }));
  const statusLabel = query.status === "open" ? "Open commercial records." : query.status === "pending" ? "Quotations waiting for approval." : "All active and historical commercial records.";
  return <div><PageHeader eyebrow="Deal core" title="Quotations" description={statusLabel} actions={<><Link className={buttonVariants({ variant: "outline" })} href="/app/pipeline"><Kanban data-icon="inline-start"/>Pipeline</Link>{canCreate && <Link className={buttonVariants({ size: "lg" })} href="/app/quotations/new"><FilePlus2 data-icon="inline-start"/>New quotation</Link>}</>} /><div className="filter-pills" aria-label="Quotation filters"><Link className={!query.status ? "active" : ""} href="/app/quotations"><SlidersHorizontal/>All</Link><Link className={query.status === "open" ? "active" : ""} href="/app/quotations?status=open">Open</Link><Link className={query.status === "pending" ? "active" : ""} href="/app/quotations?status=pending">Pending approval</Link></div><DataTable columns={[{ key: "code", label: "Quotation", priority: "primary" }, { key: "customer", label: "Customer", priority: "primary" }, { key: "amount", label: "Amount" }, { key: "stage", label: "Stage" }, { key: "risk", label: "Approval route", priority: "secondary" }, { key: "revision", label: "Revision", priority: "secondary" }, { key: "owner", label: "Owner", priority: "secondary" }]} rows={rows} empty="No quotations match this view."/></div>;
}
