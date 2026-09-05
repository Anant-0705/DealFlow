import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SplitPlanTable } from "@/components/fulfillment/SplitPlanTable";
import { ManualOverrideGrid } from "@/components/fulfillment/ManualOverrideGrid";
import { ConsolidatePrompt } from "@/components/fulfillment/ConsolidatePrompt";
import { acceptSuggestedSplit, markShipped } from "@/modules/inventory/actions";
import { getFulfillmentOrder } from "@/modules/inventory/queries";
import { orderAlreadyPlanned } from "@/modules/inventory/fulfillment-status";

export default async function FulfillmentOrderPage({ params, searchParams }: { params: Promise<{ orderCode: string }>; searchParams: Promise<{ notice?: string }> }) {
  const [{ orderCode }, query, session] = await Promise.all([params, searchParams, requireSession()]);
  const data = await getFulfillmentOrder(orderCode); if (!data) notFound();
  const { order, plan, stock, warehouses } = data;
  const canOperate = ["FINANCE", "ADMIN"].includes(session.role);
  const hasPlan = orderAlreadyPlanned(order.lines);
  const consolidatable = order.lines.flatMap((line) => line.backorders.filter((backorder) => !backorder.consolidatedAt && stock.some((row) => row.productId === line.productId && row.variantId === line.variantId && row.onHand - row.reserved > 0)).map((backorder) => ({ id: backorder.id, qty: backorder.qty, productName: line.product.name })));
  return <div><Link className="back-link" href="/app/fulfillment">← Fulfillment</Link>{query.notice && <div className="alert success">{query.notice}</div>}<div className="page-header"><div><div className="eyebrow">{order.quote.customer.name} · Confirmed {order.confirmedAt.toLocaleDateString("en-IN")}</div><h1>{order.code}</h1><p>Promised {order.promisedDeliveryDate?.toLocaleDateString("en-IN") ?? "Not set"}</p></div><StatusBadge status={order.quote.fulfillmentStatus}/></div>{canOperate && <ConsolidatePrompt orderCode={order.code} backorders={consolidatable}/>}<section className="panel"><div className="panel-heading"><div><span className="eyebrow">{hasPlan ? "Committed plan" : "Live recommendation"}</span><h2>Warehouse split</h2></div>{canOperate && !hasPlan && <form action={acceptSuggestedSplit}><input type="hidden" name="orderCode" value={order.code}/><button className="button primary">Accept Suggested Split</button></form>}</div>{hasPlan ? <div className="table-scroll"><table><thead><tr><th>Line</th><th>Warehouse</th><th>Qty</th><th>State</th><th/></tr></thead><tbody>{order.lines.flatMap((line) => line.allocations.map((allocation) => <tr key={allocation.id}><td>{line.product.name}</td><td>{allocation.warehouse.name}</td><td>{allocation.qty}</td><td>{allocation.shippedAt ? `Shipped ${allocation.shippedAt.toLocaleDateString("en-IN")}` : "Reserved"}</td><td>{canOperate && !allocation.shippedAt && <form action={markShipped}><input type="hidden" name="allocationId" value={allocation.id}/><input type="hidden" name="orderCode" value={order.code}/><button className="button secondary small">Mark shipped</button></form>}</td></tr>))}</tbody></table></div> : plan && <SplitPlanTable plan={plan}/>}<div className="backorder-list">{order.lines.flatMap((line) => line.backorders.filter((row) => !row.consolidatedAt).map((row) => <div key={row.id}><strong>{line.product.name} ×{row.qty} backordered</strong><span>{row.expectedAt ? `Expected ${row.expectedAt.toLocaleDateString("en-IN")}` : "Expected date unknown"}</span></div>))}</div></section>{canOperate && <ManualOverrideGrid orderCode={order.code} lines={order.lines} warehouses={warehouses} disabled={hasPlan}/>}</div>;
}
