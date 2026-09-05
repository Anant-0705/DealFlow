import { listWarehouses } from "@/modules/inventory/queries";
import { saveStock, saveWarehouse, scheduleStockReceipt } from "@/modules/inventory/actions";
import { replenishmentNeed } from "@/modules/inventory/replenish";
import { prisma } from "@/lib/prisma";

export default async function WarehousesSettingsPage() {
  const [warehouses, products] = await Promise.all([
    listWarehouses(),
    prisma.product.findMany({ include: { variants: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div>
      <div className="warehouse-grid">
        {warehouses.map((warehouse) => (
          <section className="panel" key={warehouse.id}>
            <form action={saveWarehouse} className="compact-form">
              <input type="hidden" name="id" value={warehouse.id}/>
              <input name="name" defaultValue={warehouse.name}/>
              <input name="code" defaultValue={warehouse.code}/>
              <label>Ship cost ₹<input name="shippingCostRupees" type="number" defaultValue={warehouse.shippingCostWeightPaise / 100}/></label>
              <label>Lead days<input name="replenishmentLeadDays" type="number" defaultValue={warehouse.replenishmentLeadDays}/></label>
              <label className="check"><input name="active" type="checkbox" defaultChecked={warehouse.active}/>Active</label>
              <button className="button secondary small">Save</button>
            </form>
            <h3>Stock grid</h3>
            <div className="stock-list">
              {warehouse.stock.map((stock) => {
                const need = replenishmentNeed({ ...stock, warehouse: { name: warehouse.name, replenishmentLeadDays: warehouse.replenishmentLeadDays }, product: stock.product, variant: stock.variant });
                return (
                  <form action={saveStock} key={stock.id}>
                    <input type="hidden" name="warehouseId" value={warehouse.id}/>
                    <input type="hidden" name="productId" value={stock.productId}/>
                    <input type="hidden" name="variantId" value={stock.variantId ?? ""}/>
                    <span>{stock.product.name}<small>{stock.variant ? `${stock.variant.attributeName}: ${stock.variant.attributeValue}` : "Base"}{need ? ` · Reorder ${need.qty}` : ""}</small></span>
                    <label>On hand<input name="onHand" type="number" defaultValue={stock.onHand}/></label>
                    <span>Reserved <b>{stock.reserved}</b></span>
                    <span>Available <b>{stock.onHand - stock.reserved}</b></span>
                    <label>Reorder at<input name="reorderPoint" type="number" min="0" defaultValue={stock.reorderPoint}/></label>
                    <label>Reorder qty<input name="reorderQty" type="number" min="0" defaultValue={stock.reorderQty}/></label>
                    <label>Max on hand<input name="maxOnHand" type="number" min="0" defaultValue={stock.maxOnHand}/></label>
                    <button className="button secondary small">Update</button>
                  </form>
                );
              })}
            </div>
            <form action={saveStock} className="stock-create">
              <input type="hidden" name="warehouseId" value={warehouse.id}/>
              <select name="productId">{products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select>
              <input name="variantId" type="hidden" value=""/>
              <input name="onHand" type="number" min="0" placeholder="On hand"/>
              <input name="reorderPoint" type="number" min="0" placeholder="Reorder at"/>
              <input name="reorderQty" type="number" min="0" placeholder="Reorder qty"/>
              <input name="maxOnHand" type="number" min="0" placeholder="Max"/>
              <button className="button primary small">Add stock row</button>
            </form>
            <form action={scheduleStockReceipt} className="stock-create">
              <input type="hidden" name="warehouseId" value={warehouse.id}/>
              <select name="productId">{products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select>
              <input name="qty" type="number" min="1" placeholder="Inbound qty" required/>
              <input name="expectedAt" type="date" required/>
              <button className="button secondary small">Schedule receipt</button>
            </form>
          </section>
        ))}
      </div>
      <form action={saveWarehouse} className="panel compact-form warehouse-create">
        <input name="name" placeholder="Warehouse name" required/>
        <input name="code" placeholder="Code" required/>
        <label>Ship cost ₹<input name="shippingCostRupees" type="number" min="0"/></label>
        <label>Lead days<input name="replenishmentLeadDays" type="number" min="0"/></label>
        <label className="check"><input name="active" type="checkbox" defaultChecked/>Active</label>
        <button className="button primary">Create warehouse</button>
      </form>
    </div>
  );
}
