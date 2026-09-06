import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { formatMoney, formatPercent } from "@/lib/money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LineCommentBox } from "@/components/portal/LineCommentBox";
import { CounterOfferForm } from "@/components/portal/CounterOfferForm";
import { ConfirmButton } from "@/components/portal/ConfirmButton";
import { MessageThread } from "@/components/portal/MessageThread";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getPortalQuote } from "@/modules/negotiation/queries";
import { postMessage } from "@/modules/negotiation/actions";
import { getDocumentParties } from "@/modules/company/queries";
import { DocumentReadyAlert } from "@/components/print/DocumentBlocked";

export default async function PortalQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const [{ code }, query, session] = await Promise.all([params, searchParams, requireSession()]);
  const quote = await getPortalQuote(session.customerId!, code);
  if (!quote?.currentRevision) notFound();
  const documents = await getDocumentParties(session.customerId!);
  const safeLines = quote.currentRevision.lines.map((line) => ({ id: line.id, description: line.description, qty: line.qty, unitPricePaise: line.unitPricePaise, taxBps: line.product.taxBps, lineDiscountBps: line.lineDiscountBps }));

  return <div className="portal-page quote-view">
    <Link className="back-link" href="/portal">← My quotations</Link>
    {query.notice && <Alert><AlertDescription>{query.notice}</AlertDescription></Alert>}
    {query.error && <Alert variant="destructive"><AlertDescription>{query.error}</AlertDescription></Alert>}
    <div className="page-header"><div><div className="eyebrow">{quote.customer.name} · Revision v{quote.currentRevision.version}</div><h1>{quote.code}</h1><p>Updated {new Date(quote.lastActivityAt).toLocaleDateString("en-IN")}</p></div><StatusBadge status={quote.customerStatus}/></div>
    <DocumentReadyAlert gaps={documents.gaps} customerName={quote.customer.name} customerHref="/portal/profile" companyHref={null} action="confirm this quotation" />

    <Card>
      <CardHeader><CardTitle>Quotation lines</CardTitle><CardDescription>Current commercial terms and line-level change requests.</CardDescription></CardHeader>
      <CardContent>
        <Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Variant</TableHead><TableHead>Qty</TableHead><TableHead>Unit price</TableHead><TableHead>Discount</TableHead><TableHead>Net</TableHead><TableHead/></TableRow></TableHeader><TableBody>{quote.currentRevision.lines.map((line) => <TableRow key={line.id}><TableCell>{line.description}</TableCell><TableCell>{line.variant?.attributeValue ?? "—"}</TableCell><TableCell>{line.qty}</TableCell><TableCell>{formatMoney(line.unitPricePaise)}</TableCell><TableCell>{formatPercent(line.lineDiscountBps, 1)}</TableCell><TableCell><strong>{formatMoney(line.netPaise)}</strong></TableCell><TableCell><LineCommentBox quoteCode={quote.code} lineId={line.id}/></TableCell></TableRow>)}</TableBody></Table>
        <div className="portal-totals"><span>Subtotal <b>{formatMoney(quote.currentRevision.subtotalPaise)}</b></span><span>Discount <b>−{formatMoney(quote.currentRevision.discountPaise)}</b></span><span>Tax <b>{formatMoney(quote.currentRevision.taxPaise)}</b></span><span className="grand">Total <b>{formatMoney(quote.currentRevision.totalPaise)}</b></span></div>
      </CardContent>
    </Card>

    <div className="portal-action-grid">
      <CounterOfferForm quoteCode={quote.code} currentTotalPaise={quote.currentRevision.totalPaise} orderDiscountBps={quote.currentRevision.orderDiscountBps} lines={safeLines} disabled={quote.customerStatus === "CONFIRMED" || quote.approvalStatus === "PENDING"}/>
      <Card><CardHeader><CardTitle>Conversation</CardTitle><CardDescription>Messages shared with your sales team.</CardDescription></CardHeader><CardContent><MessageThread messages={quote.messages}/><form action={postMessage} className="message-compose"><input type="hidden" name="quoteCode" value={quote.code}/><Textarea name="text" required placeholder="Write a message to your sales team"/><Button type="submit" variant="outline" size="sm">Send message</Button></form></CardContent></Card>
    </div>
    <ConfirmButton quoteCode={quote.code} revisionId={quote.currentRevision.id} approvalStatus={quote.approvalStatus} customerStatus={quote.customerStatus}/>
  </div>;
}
