import { consolidateBackorder } from "@/modules/inventory/actions";

export function ConsolidatePrompt({ orderCode, backorders }: { orderCode: string; backorders: Array<{ id: number; qty: number; productName: string }> }) {
  if (!backorders.length) return null;
  return <div className="alert success consolidate-banner"><div><strong>Stock arrived</strong><span>Outstanding quantities can now be allocated without changing existing reservations.</span></div>{backorders.map((backorder) => <form action={consolidateBackorder} key={backorder.id}><input type="hidden" name="orderCode" value={orderCode}/><input type="hidden" name="backorderId" value={backorder.id}/><button className="button primary small">Consolidate {backorder.productName} ×{backorder.qty}</button></form>)}</div>;
}
