import Link from "next/link";
import { Boxes, CircleDollarSign, FileCheck2, FileText, IndianRupee, Plus, ShieldAlert, UserPlus } from "lucide-react";
import { requireInternal } from "@/lib/auth";
import { hasRole, QUOTE_EDITOR_ROLES, SETTINGS_ROLES } from "@/lib/roles";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { MyTasks } from "@/components/dashboard/MyTasks";
import { getDashboardData } from "@/modules/dashboard/queries";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/layout/PageHeader";
import { getCompanyProfile } from "@/modules/company/queries";
import { companyIdentityGaps } from "@/modules/company/readiness";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const session = await requireInternal();
  const canCreate = hasRole(session.role, QUOTE_EDITOR_ROLES);
  const [{ notice }, data, company] = await Promise.all([searchParams, getDashboardData(session), getCompanyProfile()]);
  const companyGaps = hasRole(session.role, SETTINGS_ROLES) ? companyIdentityGaps(company) : [];

  const metrics = [
    ...(session.role === "ADMIN" ? [{ label: "Account requests", value: data.metrics.customerAccessRequests, description: "Customers waiting for access", icon: UserPlus, href: "/app/settings/customers#access-requests" }] : []),
    { label: "Pending approvals", value: data.metrics.pendingApprovals, description: "Waiting for a decision", icon: FileCheck2, href: session.role === "REP" ? "/app/quotations?status=pending" : "/app/approvals" },
    { label: "Open quotations", value: data.metrics.openQuotations, description: "Active commercial work", icon: FileText, href: "/app/quotations?status=open" },
    { label: "At-risk deals", value: data.metrics.atRiskDeals, description: "Stalls, anomalies, and slippage", icon: ShieldAlert, href: "/app/deal-health" },
    { label: "Awaiting fulfillment", value: data.metrics.awaitingFulfillment, description: "Planned or partially allocated", icon: Boxes, href: "/app/fulfillment" },
    { label: "Unpaid invoices", value: data.metrics.unpaidInvoices, description: `${formatMoney(data.metrics.unpaidBalancePaise)} outstanding`, icon: CircleDollarSign, href: "/app/invoices?status=unpaid" },
    { label: "Revenue this month", value: formatMoney(data.metrics.revenueThisMonthPaise), description: "Payments received this month", icon: IndianRupee, href: "/app/reports?period=month" },
  ];

  return <div>
    <PageHeader eyebrow="Sales workspace" title="Good afternoon. Keep deals moving." description="One workspace for pricing discipline, approvals, and accountable execution." actions={canCreate && <Link className={buttonVariants({ size: "lg" })} href="/app/quotations/new"><Plus data-icon="inline-start"/>New quotation</Link>} />
    {notice && <Alert><AlertTitle>Workspace notice</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert>}
    {companyGaps.length > 0 && <Alert variant="destructive"><AlertTitle>Company letterhead is incomplete</AlertTitle><AlertDescription>Quotations and invoices cannot be sent, confirmed, or printed until {companyGaps.map((item) => item.label).join(", ")} are saved. <Link href="/app/settings/company">Open Settings → Company</Link></AlertDescription></Alert>}
    <div className="stats-grid dashboard-stats">{metrics.map((metric) => <StatCard key={metric.label} {...metric}/>)}</div>
    <div className="dashboard-grid">
      <Card><CardHeader><CardTitle>Recent Activity</CardTitle><CardDescription>The latest auditable events across the deals you can see.</CardDescription></CardHeader><CardContent><RecentActivity events={data.recentActivity}/></CardContent></Card>
      <Card><CardHeader><CardTitle>My Tasks</CardTitle><CardDescription>Nudges and escalations assigned directly to you.</CardDescription></CardHeader><CardContent><MyTasks tasks={data.tasks}/></CardContent></Card>
    </div>
    <div className="dashboard-actions"><Link className={buttonVariants({ variant: "outline", size: "lg" })} href={session.role === "REP" ? "/app/quotations?status=pending" : "/app/approvals"}><FileCheck2 data-icon="inline-start"/>View approvals</Link><Link className={buttonVariants({ variant: "outline", size: "lg" })} href="/app/pipeline">View pipeline</Link></div>
  </div>;
}
