"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";
import { saveProduct } from "@/modules/catalog/actions";
import type { ProductFormState } from "@/modules/catalog/schemas";

type Category = { id: number; name: string };
type Plan = { id: number; name: string };
type Warehouse = { id: number; name: string };
type ProductValue = {
  id: number;
  name: string;
  sku: string;
  categoryId: number;
  unit: string;
  taxBps: number;
  listPricePaise: number;
  costPaise: number;
  description: string;
  isSubscription: boolean;
  planId: number | null;
  isPromoted: boolean;
  active: boolean;
  imageUrl?: string | null;
};

const initialState: ProductFormState = { status: "idle", message: "" };

export function ProductForm({ categories, plans, warehouses = [], product }: { categories: Category[]; plans: Plan[]; warehouses?: Warehouse[]; product?: ProductValue }) {
  const [state, formAction, pending] = useActionState(saveProduct, initialState);
  const [isSubscription, setIsSubscription] = useState(product?.isSubscription ?? false);
  const [fileName, setFileName] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(product?.imageUrl ?? null);
  const error = (field: string) => state.fieldErrors?.[field]?.[0];

  return <form action={formAction} className="panel form-stack">
    {product && <input type="hidden" name="id" value={product.id}/>}
    <div><span className="eyebrow">{product ? "Edit product" : "Create"}</span><h2>{product?.name ?? "New product"}</h2></div>
    {state.message && <div className={`alert ${state.status === "success" ? "success" : "danger"}`} role={state.status === "error" ? "alert" : "status"} aria-live="polite"><strong>{state.status === "error" ? "Product not saved" : "Saved"}</strong><span>{state.message}</span></div>}
    <label>Name *<input name="name" defaultValue={product?.name} required aria-invalid={Boolean(error("name"))}/>{error("name") && <small className="field-error">{error("name")}</small>}</label>
    <div className="form-row">
      <label>SKU *<input name="sku" defaultValue={product?.sku} required aria-invalid={Boolean(error("sku"))}/>{error("sku") && <small className="field-error">{error("sku")}</small>}</label>
      <label>Category *<select name="categoryId" required defaultValue={product?.categoryId}>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select>{error("categoryId") && <small className="field-error">{error("categoryId")}</small>}</label>
    </div>
    <div className="form-row">
      <label>Unit *<input name="unit" defaultValue={product?.unit ?? "each"} required/>{error("unit") && <small className="field-error">{error("unit")}</small>}</label>
      <label>Tax % *<input name="taxPercent" type="number" step="0.01" defaultValue={product ? product.taxBps / 100 : 18} min="0" max="100" required/>{error("taxPercent") && <small className="field-error">{error("taxPercent")}</small>}</label>
    </div>
    <div className="form-row">
      <label>List price ₹ *<input name="listPriceRupees" type="number" step="0.01" min="0.01" defaultValue={product ? product.listPricePaise / 100 : undefined} required/>{error("listPriceRupees") && <small className="field-error">{error("listPriceRupees")}</small>}</label>
      <label>Cost ₹ *<input name="costRupees" type="number" step="0.01" min="0" defaultValue={product ? product.costPaise / 100 : undefined} required/>{error("costRupees") && <small className="field-error">{error("costRupees")}</small>}</label>
    </div>
    <label>Description *<textarea name="description" defaultValue={product?.description} required/>{error("description") && <small className="field-error">{error("description")}</small>}</label>
    <div className="product-image-field">
      <span style={{ display: "block", color: "#536159", fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>Product image</span>
      {previewUrl && (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem", padding: "0.5rem", borderRadius: "8px", background: "var(--surface-muted, #f5ebe0)", border: "1px solid var(--line, #e2d4c7)" }}>
          <img
            src={previewUrl}
            alt={product?.name ?? "Product preview"}
            style={{ width: "56px", height: "56px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--line, #e2d4c7)" }}
          />
          <label className="check" style={{ margin: 0, fontSize: "0.875rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              name="removeImage"
              onChange={(e) => {
                if (e.target.checked) setPreviewUrl(null);
                else setPreviewUrl(product?.imageUrl ?? null);
              }}
            />
            Remove current image
          </label>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "6px" }}>
        <input
          type="file"
          id="product-image-upload"
          name="image"
          accept="image/png,image/jpeg,image/webp"
          style={{ position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", border: 0 }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setFileName(file.name);
              setPreviewUrl(URL.createObjectURL(file));
            } else {
              setFileName("");
            }
          }}
        />
        <label
          htmlFor="product-image-upload"
          className="button secondary"
          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "7px", minHeight: "36px", margin: 0 }}
        >
          <Upload size={14} aria-hidden="true" />
          <span>Choose image file</span>
        </label>
        <span style={{ fontSize: "12px", color: fileName ? "#302925" : "var(--muted)", fontWeight: fileName ? 600 : 400, maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {fileName || "No file chosen"}
        </span>
      </div>
      {error("image") ? <small className="field-error">{error("image")}</small> : <small className="form-help">Optional PNG, JPEG, or WebP product image stored in Cloudflare R2.</small>}
    </div>
    {!product && (
      <div className="form-row">
        <label>Warehouse *<select name="warehouseId" required defaultValue={warehouses[0]?.id ?? ""} aria-invalid={Boolean(error("warehouseId"))}><option value="" disabled>Choose a warehouse</option>{warehouses.map((warehouse) => <option value={warehouse.id} key={warehouse.id}>{warehouse.name}</option>)}</select>{error("warehouseId") ? <small className="field-error">{error("warehouseId")}</small> : <small className="form-help">{warehouses.length ? "Opening stock is listed in Fulfillment for this warehouse." : "Create a warehouse in Settings → Warehouses first."}</small>}</label>
        <label>Opening stock *<input name="openingQty" type="number" min="0" max="1000000" defaultValue={0} required aria-invalid={Boolean(error("openingQty"))}/>{error("openingQty") ? <small className="field-error">{error("openingQty")}</small> : <small className="form-help">Units available in the selected warehouse. Use 0 if stock will arrive later.</small>}</label>
      </div>
    )}
    <label className="check"><input type="checkbox" name="isSubscription" defaultChecked={isSubscription} onChange={(event) => setIsSubscription(event.target.checked)}/>Subscription product</label>
    <label>Billing plan{isSubscription ? " *" : ""}<select name="planId" defaultValue={product?.planId ?? ""} disabled={!isSubscription} required={isSubscription} aria-invalid={Boolean(error("planId"))}><option value="">Choose a billing plan</option>{plans.map((plan) => <option value={plan.id} key={plan.id}>{plan.name}</option>)}</select><small className={error("planId") ? "field-error" : "form-help"}>{error("planId") ?? (isSubscription ? "Required because this product has recurring billing." : "Enable Subscription product only for recurring items.")}</small></label>
    <div className="form-row"><label className="check"><input type="checkbox" name="isPromoted" defaultChecked={product?.isPromoted}/>Promoted</label><label className="check"><input type="checkbox" name="active" defaultChecked={product?.active ?? true}/>Active (available in quotations)</label></div>
    <button className="button primary" disabled={pending}>{pending ? "Saving…" : product ? "Save product" : "Create product"}</button>
  </form>;
}
