import { recordStockReceipt } from "@/modules/inventory/actions";

export function StockReceiptForm({ row }: { row: { warehouseId: number; productId: number; variantId: number | null; warehouse: { name: string }; product: { name: string }; variant: { attributeValue: string } | null } }) {
  return <form action={recordStockReceipt} className="receipt-form"><input type="hidden" name="warehouseId" value={row.warehouseId}/><input type="hidden" name="productId" value={row.productId}/><input type="hidden" name="variantId" value={row.variantId ?? ""}/><span>{row.warehouse.name} · {row.product.name} {row.variant?.attributeValue ?? ""}</span><input name="qty" type="number" min="1" placeholder="Qty" required/><button className="button secondary small">Record receipt</button></form>;
}
