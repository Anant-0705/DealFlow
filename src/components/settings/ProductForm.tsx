"use client";

import { useActionState, useState } from "react";
import { saveProduct } from "@/modules/catalog/actions";
import type { ProductFormState } from "@/modules/catalog/schemas";

type Category = { id: number; name: string };
type Plan = { id: number; name: string };
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
};

const initialState: ProductFormState = { status: "idle", message: "" };

export function ProductForm({ categories, plans, product }: { categories: Category[]; plans: Plan[]; product?: ProductValue }) {
  const [state, formAction, pending] = useActionState(saveProduct, initialState);
  const [isSubscription, setIsSubscription] = useState(product?.isSubscription ?? false);
  const error = (field: string) => state.fieldErrors?.[field]?.[0];

  return <form action={formAction} className="panel form-stack">
    {product && <input type="hidden" name="id" value={product.id}/>}
    <div><span className="eyebrow">{product ? "Edit product" : "Create"}</span><h2>{product?.name ?? "New product"}</h2></div>
    {state.message && <div className={`alert ${state.status === "success" ? "success" : "danger"}`} role={state.status === "error" ? "alert" : "status"} aria-live="polite"><strong>{state.status === "error" ? "Product not saved" : "Saved"}</strong><span>{state.message}</span></div>}
    <label>Name<input name="name" defaultValue={product?.name} required aria-invalid={Boolean(error("name"))}/>{error("name") && <small className="field-error">{error("name")}</small>}</label>
    <div className="form-row">
      <label>SKU<input name="sku" defaultValue={product?.sku} required aria-invalid={Boolean(error("sku"))}/>{error("sku") && <small className="field-error">{error("sku")}</small>}</label>
      <label>Category<select name="categoryId" defaultValue={product?.categoryId}>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select>{error("categoryId") && <small className="field-error">{error("categoryId")}</small>}</label>
    </div>
    <div className="form-row">
      <label>Unit<input name="unit" defaultValue={product?.unit ?? "each"} required/>{error("unit") && <small className="field-error">{error("unit")}</small>}</label>
      <label>Tax %<input name="taxPercent" type="number" step="0.01" defaultValue={product ? product.taxBps / 100 : 18} min="0" max="100"/>{error("taxPercent") && <small className="field-error">{error("taxPercent")}</small>}</label>
    </div>
    <div className="form-row">
      <label>List price ₹<input name="listPriceRupees" type="number" step="0.01" min="0.01" defaultValue={product ? product.listPricePaise / 100 : undefined} required/>{error("listPriceRupees") && <small className="field-error">{error("listPriceRupees")}</small>}</label>
      <label>Cost ₹<input name="costRupees" type="number" step="0.01" min="0" defaultValue={product ? product.costPaise / 100 : undefined} required/>{error("costRupees") && <small className="field-error">{error("costRupees")}</small>}</label>
    </div>
    <label>Description<textarea name="description" defaultValue={product?.description} required/>{error("description") && <small className="field-error">{error("description")}</small>}</label>
    <label className="check"><input type="checkbox" name="isSubscription" defaultChecked={isSubscription} onChange={(event) => setIsSubscription(event.target.checked)}/>Subscription product</label>
    <label>Billing plan<select name="planId" defaultValue={product?.planId ?? ""} disabled={!isSubscription} required={isSubscription} aria-invalid={Boolean(error("planId"))}><option value="">Choose a billing plan</option>{plans.map((plan) => <option value={plan.id} key={plan.id}>{plan.name}</option>)}</select><small className={error("planId") ? "field-error" : "form-help"}>{error("planId") ?? (isSubscription ? "Required because this product has recurring billing." : "Enable Subscription product only for recurring items.")}</small></label>
    <div className="form-row"><label className="check"><input type="checkbox" name="isPromoted" defaultChecked={product?.isPromoted}/>Promoted</label><label className="check"><input type="checkbox" name="active" defaultChecked={product?.active ?? true}/>Active</label></div>
    <button className="button primary" disabled={pending}>{pending ? "Saving…" : product ? "Save product" : "Create product"}</button>
  </form>;
}
