import { scheduleStockReceipt } from "@/modules/inventory/actions";
import type { ReplenishmentNeed } from "@/modules/inventory/replenish";

export function ReplenishmentPanel({ needs }: { needs: ReplenishmentNeed[] }) {
  if (!needs.length) return null;
  return (
    <section className="panel section-gap">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Replenishment rules</span>
          <h2>Below reorder point</h2>
        </div>
      </div>
      <div className="replenish-list">
        {needs.map((need) => (
          <form action={scheduleStockReceipt} key={`${need.warehouseId}-${need.productId}-${need.variantId ?? "base"}`}>
            <input type="hidden" name="warehouseId" value={need.warehouseId}/>
            <input type="hidden" name="productId" value={need.productId}/>
            <input type="hidden" name="variantId" value={need.variantId ?? ""}/>
            <div>
              <strong>{need.warehouseName} · {need.productName}</strong>
              <span>{need.reason}</span>
            </div>
            <label>Qty<input name="qty" type="number" min="1" defaultValue={need.qty}/></label>
            <label>Expected<input name="expectedAt" type="date" defaultValue={need.expectedAt.toISOString().slice(0, 10)} required/></label>
            <button className="button primary small">Schedule inbound</button>
          </form>
        ))}
      </div>
    </section>
  );
}
