import Link from "next/link";
import { notFound } from "next/navigation";
import { QuoteBuilder } from "@/components/quotes/QuoteBuilder";
import { DealTimeline } from "@/components/quotes/DealTimeline";
import { RevisionDiff } from "@/components/quotes/RevisionDiff";
import { MessageThread } from "@/components/portal/MessageThread";
import { SplitPlanTable } from "@/components/fulfillment/SplitPlanTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";
import { getBuilderData, getQuoteDetail } from "@/modules/quotes/queries";
import { requireInternal } from "@/lib/auth";
import { sendToCustomer, confirmOnBehalf, postMessage, replyAndRevise, acceptCounter } from "@/modules/negotiation/actions";
import { diffRevisions } from "@/modules/negotiation/diff";
import { getTimeline } from "@/modules/timeline/queries";
import { getQuoteFulfillmentPreview } from "@/modules/inventory/queries";
import { getQuoteBillingPreview } from "@/modules/billing/queries";
import { getDocumentParties } from "@/modules/company/queries";
import { DocumentReadyAlert } from "@/components/print/DocumentBlocked";
import { DocumentActions } from "@/components/print/DocumentActions";

const tabs = ["overview", "timeline", "messages", "fulfillment", "billing"] as const;

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ tab?: string; error?: string; notice?: string }>;
}) {
  const [{ code }, query, session] = await Promise.all([params, searchParams, requireInternal()]);
  const quote = await getQuoteDetail(code);
  if (!quote?.currentRevision) notFound();

  const tab = tabs.includes(query.tab as typeof tabs[number]) ? query.tab as typeof tabs[number] : "overview";
  const canEdit = session.role === "ADMIN" || (session.role === "REP" && quote.ownerId === session.userId);
  const [data, timeline, fulfillment, billing, documents] = await Promise.all([
    getBuilderData(),
    getTimeline(quote.id),
    getQuoteFulfillmentPreview(quote.id),
    getQuoteBillingPreview(quote.id),
    getDocumentParties(quote.customerId),
  ]);
  const previous = quote.revisions.find((revision) => revision.version === quote.currentRevision!.version - 1);
  const diff = previous ? diffRevisions(previous, quote.currentRevision) : null;
  const safeQuote = { ...quote, currentRevision: quote.currentRevision };
  const previewDate = new Date().toISOString();

  return <div className="deal-workspace">
    <nav className="deal-tabs" aria-label="Quotation workspace">
      {tabs.map((name) => <Link className={buttonVariants({ variant: tab === name ? "secondary" : "ghost", size: "sm" })} href={`/app/quotations/${code}?tab=${name}`} key={name}>{name}</Link>)}
    </nav>
    {query.notice && <Alert><AlertDescription>{query.notice}</AlertDescription></Alert>}
    {query.error && <Alert variant="destructive"><AlertDescription>{query.error}</AlertDescription></Alert>}

    {tab === "overview" && <>
      <DocumentReadyAlert gaps={documents.gaps} customerName={quote.customer.name} customerHref={`/app/settings/customers/${quote.customer.code}`} />
      <div className="deal-actions">
        {quote.approvalStatus === "APPROVED" && quote.customerStatus === "SENT" && <Button type="button" variant="outline" disabled>Sent to customer</Button>}
        {quote.approvalStatus === "APPROVED" && quote.customerStatus !== "CONFIRMED" && quote.customerStatus !== "SENT" && <form action={sendToCustomer}><input type="hidden" name="quoteCode" value={quote.code}/><SubmitButton pendingLabel="Sending…">Send to customer</SubmitButton></form>}
        {quote.approvalStatus === "APPROVED" && quote.customerStatus !== "CONFIRMED" && <form action={confirmOnBehalf}><input type="hidden" name="quoteCode" value={quote.code}/><input type="hidden" name="revisionId" value={quote.currentRevision.id}/><Button type="submit" variant="outline">Confirm on behalf</Button></form>}
        {quote.currentRevision.createdVia === "PORTAL" && <form action={acceptCounter}><input type="hidden" name="quoteCode" value={quote.code}/><Button type="submit" variant="secondary">Accept counter</Button></form>}
        {quote.orders[0] && <Link className={buttonVariants({ variant: "outline" })} href={`/app/fulfillment/${quote.orders[0].code}`}>Open {quote.orders[0].code}</Link>}
        <DocumentActions printHref={`/app/print/quote/${quote.code}`} pdfHref={`/app/print/quote/${quote.code}/pdf`} />
      </div>
      <QuoteBuilder quote={safeQuote} products={data.products} policy={data.policy} pairings={data.pairings} stock={data.stock} warehouses={data.warehouses} previewDate={previewDate} canEdit={canEdit}/>
      {diff && <RevisionDiff diff={diff}/>}
    </>}

    {tab === "timeline" && <Card><CardHeader><CardTitle>Deal timeline</CardTitle><CardDescription>Complete audit history across revisions and decisions.</CardDescription></CardHeader><CardContent><DealTimeline events={timeline}/></CardContent></Card>}

    {tab === "messages" && <Card><CardHeader><CardTitle>Messages</CardTitle><CardDescription>Customer collaboration tied to this quotation.</CardDescription></CardHeader><CardContent><MessageThread messages={quote.messages}/><form className="message-compose"><input type="hidden" name="quoteCode" value={quote.code}/><Textarea name="text" required placeholder="Reply to the customer"/><div className="message-buttons"><Button type="submit" size="sm" formAction={postMessage}>Send reply</Button>{canEdit && <Button type="submit" variant="outline" size="sm" formAction={replyAndRevise}>Reply and create revision</Button>}</div></form></CardContent></Card>}

    {tab === "fulfillment" && <Card><CardHeader><CardTitle>Live warehouse outcome</CardTitle><CardDescription>Preview only. Stock is reserved after confirmation.</CardDescription></CardHeader><CardContent>{fulfillment && <SplitPlanTable plan={fulfillment}/>}</CardContent></Card>}

    {tab === "billing" && <Card><CardHeader><CardTitle>Confirmation billing</CardTitle><CardDescription>Preview only. No invoice has been issued.</CardDescription></CardHeader><CardContent>{billing && <><div className="plan-summary"><span>One-time invoice <b>{formatMoney(billing.oneTimePaise)}</b></span><span>First recurring bill <b>{formatMoney(billing.firstRecurringPaise)}</b></span></div><div className="line-list">{billing.lines.map((line, index) => <div key={`${line.description}-${index}`}><span>{line.description}<small>{line.detail}</small></span><b>{formatMoney(line.amountPaise)}</b></div>)}</div></>}</CardContent></Card>}
  </div>;
}
