/* eslint-disable react-hooks/purity */
import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { APPROVER_ROLES } from "@/lib/roles";
import { getApprovalInbox } from "@/modules/approvals/queries";
import { DataTable } from "@/components/shared/DataTable";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/layout/PageHeader";
export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) { const session = await requirePageRole(APPROVER_ROLES); const { filter } = await searchParams; const steps = await getApprovalInbox(session.role, filter === "all"); const rows = steps.map((step) => ({ id: step.id, href: `/app/approvals/${step.revision.quote.code}`, quote: step.revision.quote.code, customer: step.revision.quote.customer.name, total: formatMoney(step.revision.totalPaise), route: step.revision.requiredLevel, rep: step.revision.quote.owner.name, status: step.status })); return <div><PageHeader eyebrow="Governance queue" title="Approval inbox" description="Finance steps unlock only after the manager has approved." actions={<div className="filter-pills"><Link className={filter !== "all" ? "active" : ""} href="/app/approvals">Pending only</Link><Link className={filter === "all" ? "active" : ""} href="/app/approvals?filter=all">All</Link></div>} /><DataTable columns={[{ key: "quote", label: "Quote" }, { key: "customer", label: "Customer" }, { key: "total", label: "Total" }, { key: "route", label: "Required" }, { key: "rep", label: "Rep" }, { key: "status", label: "Status" }]} rows={rows} empty="No approval steps match this view."/></div>; }
