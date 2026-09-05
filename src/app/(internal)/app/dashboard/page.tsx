/* eslint-disable react-hooks/purity */
import Link from "next/link";
import { ArrowRight, FileCheck2, FileText, Plus, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireInternal } from "@/lib/auth";
import { hasRole, QUOTE_EDITOR_ROLES } from "@/lib/roles";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const session = await requireInternal();
  const canCreate = hasRole(session.role, QUOTE_EDITOR_ROLES);
  const [{ notice }, pending, open, atRisk] = await Promise.all([
    searchParams,
    prisma.quote.count({ where: { approvalStatus: "PENDING" } }),
    prisma.quote.count({ where: { customerStatus: { in: ["DRAFT", "SENT", "NEGOTIATING"] } } }),
    prisma.quote.count({ where: { lastActivityAt: { lt: new Date(Date.now() - 5 * 86_400_000) }, customerStatus: { not: "CONFIRMED" } } }),
  ]);

  const metrics = [
    { label: "Pending approvals", value: pending, description: "Waiting for a decision", icon: FileCheck2 },
    { label: "Open quotations", value: open, description: "Active commercial work", icon: FileText },
    { label: "At-risk deals", value: atRisk, description: "Idle more than 5 days", icon: ShieldAlert },
  ];

  return <div>
    <div className="page-header">
      <div><div className="eyebrow">Sales workspace</div><h1>Good afternoon. Keep deals moving.</h1><p>One workspace for pricing discipline, approvals, and accountable execution.</p></div>
      {canCreate && <Link className={buttonVariants({ size: "lg" })} href="/app/quotations/new"><Plus data-icon="inline-start"/>New quotation</Link>}
    </div>
    {notice && <Alert><AlertTitle>Workspace notice</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert>}
    <div className="stats-grid">{metrics.map(({ label, value, description, icon: Icon }) => <Card key={label}><CardHeader><CardTitle>{label}</CardTitle><CardDescription>{description}</CardDescription><CardAction><Icon aria-hidden="true"/></CardAction></CardHeader><CardContent><strong>{value}</strong></CardContent></Card>)}</div>
    <div className="dashboard-grid">
      <Card><CardHeader><CardTitle>From quote to cash</CardTitle><CardDescription>Every commercial decision stays explainable from the first draft through fulfillment and billing.</CardDescription></CardHeader><CardContent><ol className="operating-loop"><li><b>01</b><span><strong>Build</strong><small>Customer pricing, lines, margin and upsells</small></span></li><li><b>02</b><span><strong>Negotiate</strong><small>Messages and counter offers create traceable revisions</small></span></li><li><b>03</b><span><strong>Fulfill</strong><small>Stock-aware allocation exposes every shipment split</small></span></li><li><b>04</b><span><strong>Bill</strong><small>Invoices and subscriptions follow confirmed terms</small></span></li></ol></CardContent></Card>
      <Card><CardHeader><CardTitle>Open the live pipeline</CardTitle><CardDescription>See every active quotation, approval path, and customer state in one view.</CardDescription></CardHeader><CardFooter><Link className={buttonVariants()} href="/app/pipeline">View pipeline<ArrowRight data-icon="inline-end"/></Link></CardFooter></Card>
    </div>
  </div>;
}
