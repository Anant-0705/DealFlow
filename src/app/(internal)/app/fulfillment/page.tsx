import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StockTable } from "@/components/fulfillment/StockTable";
import { StockReceiptForm } from "@/components/fulfillment/StockReceiptForm";
import { ReplenishmentPanel } from "@/components/fulfillment/ReplenishmentPanel";
import { getStockSnapshot, listFulfillmentOrders } from "@/modules/inventory/queries";
import { replenishmentNeeds } from "@/modules/inventory/replenish";

export default async function FulfillmentPage() {
  const [session, stock, orders] = await Promise.all([requireSession(), getStockSnapshot(), listFulfillmentOrders()]);
  const canOperate = ["FINANCE", "ADMIN"].includes(session.role);
  const needs = replenishmentNeeds(stock);
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Execution control</div>
          <h1>Fulfillment</h1>
          <p>Live availability, reservations, split shipments, backorders, and replenishment.</p>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">Live stock</span><h2>Warehouse × product</h2></div></div>
        <StockTable rows={stock}/>
        {canOperate && <details className="receipt-panel"><summary>Record a stock receipt</summary><div className="receipt-list">{stock.map((row) => <StockReceiptForm row={row} key={row.id}/>)}</div></details>}
      </section>
      {canOperate && <ReplenishmentPanel needs={needs}/>}
      <section className="panel section-gap">
        <div className="panel-heading"><div><span className="eyebrow">Awaiting operations</span><h2>Confirmed orders</h2></div></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Order</th><th>Customer</th><th>Confirmed</th><th>Promised</th><th>Status</th><th>Warehouses involved</th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><Link href={`/app/fulfillment/${order.code}`}>{order.code}</Link></td>
                  <td>{order.quote.customer.name}</td>
                  <td>{order.confirmedAt.toLocaleDateString("en-IN")}</td>
                  <td>{order.promisedDeliveryDate?.toLocaleDateString("en-IN") ?? "—"}</td>
                  <td><StatusBadge status={order.quote.fulfillmentStatus}/></td>
                  <td>{[...new Set(order.lines.flatMap((line) => line.allocations.map((allocation) => allocation.warehouse.name)))].join(", ") || "Plan not accepted"}</td>
                </tr>
              ))}
              {!orders.length && <tr><td className="empty-cell" colSpan={6}>No orders are awaiting fulfillment.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
