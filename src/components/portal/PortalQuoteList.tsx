import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export function PortalQuoteList({ quotes }: { quotes: Array<{ code: string; customerStatus: string; lastActivityAt: Date; currentRevision: { version: number; totalPaise: number } | null }> }) {
  if (!quotes.length) return <Empty><EmptyHeader><EmptyTitle>No quotations yet</EmptyTitle><EmptyDescription>No live quotations have been sent to you.</EmptyDescription></EmptyHeader></Empty>;
  return <div className="portal-quote-list">{quotes.map((quote) => <Link href={`/portal/quotes/${quote.code}`} key={quote.code}><Card><CardHeader><CardTitle>{quote.code}</CardTitle><CardDescription>{new Date(quote.lastActivityAt).toLocaleDateString("en-IN")}</CardDescription><CardAction><StatusBadge status={quote.customerStatus}/></CardAction></CardHeader><CardContent><b className="metric">{formatMoney(quote.currentRevision?.totalPaise ?? 0)}</b><small>Revision v{quote.currentRevision?.version ?? 1} · Open quotation</small></CardContent></Card></Link>)}</div>;
}
