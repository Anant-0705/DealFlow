import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UpcomingSchedule } from "@/components/billing/UpcomingSchedule";
import { InvoiceCard } from "@/components/billing/InvoiceCard";
import { SubscriptionChangeForm } from "@/components/billing/SubscriptionChangeForm";
import { getBillingOrder } from "@/modules/billing/queries";

export default async function BillingOrderPage({ params }: { params: Promise<{ orderCode: string }> }) {
  const { orderCode } = await params; const data = await getBillingOrder(orderCode); if (!data) notFound(); const { order, schedules } = data;
  const oneTime = order.lines.filter((line) => !line.product.isSubscription);
  return <div><Link className="back-link" href="/app/billing">← Subscriptions</Link><div className="page-header"><div><div className="eyebrow">{order.quote.customer.name} · {order.code}</div><h1>Billing workspace</h1><p>Snapshot prices from the confirmed quotation.</p></div></div><div className="billing-layout"><div><section className="panel"><span className="eyebrow">One-time lines</span><h2>Due at confirmation</h2><div className="line-list">{oneTime.map((line) => <div key={line.id}><span>{line.product.name} ×{line.qty}</span><b>{formatMoney(line.quoteLine.netPaise + line.quoteLine.taxPaise)}</b></div>)}{!oneTime.length && <p className="muted">No one-time lines.</p>}</div></section><section className="panel section-gap"><span className="eyebrow">Recurring lines</span><h2>Subscriptions</h2><div className="subscription-list">{order.subscriptions.map((subscription) => <article key={subscription.id}><div className="split"><div><strong>{subscription.orderLine.product.name}</strong><span>{subscription.plan.name} · {subscription.qty} seats</span></div><StatusBadge status={subscription.status}/></div><b>{formatMoney(subscription.unitPricePaise * subscription.qty)} / {subscription.plan.interval.toLowerCase()}</b><UpcomingSchedule rows={schedules.find((row) => row.subscriptionId === subscription.id)?.rows ?? []}/><SubscriptionChangeForm orderCode={order.code} subscription={{ ...subscription, startsAt: subscription.startsAt.toISOString() }}/></article>)}{!order.subscriptions.length && <p className="muted">No recurring lines.</p>}</div></section></div><aside className="panel"><span className="eyebrow">Money records</span><h2>Invoices</h2><div className="invoice-list">{order.invoices.map((invoice) => <InvoiceCard invoice={invoice} key={invoice.id}/>)}</div></aside></div></div>;
}
