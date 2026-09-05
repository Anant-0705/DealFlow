import type { ExpectedReceiptRow } from "@/modules/health/queries";

export function ExpectedReceipts({ receipts }: { receipts: ExpectedReceiptRow[] }) {
  return (
    <section className="panel section-gap">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Inbound covering promises</span>
          <h2>Expected receipts</h2>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Warehouse</th><th>Product</th><th>Qty</th><th>Expected</th></tr></thead>
          <tbody>
            {receipts.map((receipt) => (
              <tr key={receipt.id}>
                <td>{receipt.warehouse}</td>
                <td>{receipt.product}{receipt.variant ? ` (${receipt.variant})` : ""}</td>
                <td>{receipt.qty}</td>
                <td>{receipt.expectedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</td>
              </tr>
            ))}
            {!receipts.length && <tr><td className="empty-cell" colSpan={4}>No inbound is scheduled. Schedule a receipt from a slippage alert, Fulfillment, or Settings → Warehouses.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
