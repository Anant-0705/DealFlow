import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatMoney, formatPercent } from "@/lib/money";
import type { EvaluatedLine } from "@/modules/pricing/types";
import { MAX_LINE_QTY } from "@/modules/quotes/schemas";

type Variant = { id: number; attributeName: string; attributeValue: string; extraPricePaise: number };
export type BuilderLine = { productId: number; variantId: number | null; qty: number; lineDiscountBps: number };
export function LineRow({ line, calculated, name, listPricePaise, variants, tierDefaultBps, editable, onChange, onRemove }: { line: BuilderLine; calculated: EvaluatedLine; name: string; listPricePaise: number; variants: Variant[]; tierDefaultBps: number; editable: boolean; onChange: (line: BuilderLine) => void; onRemove: () => void }) {
  const [qtyError, setQtyError] = useState("");
  const setQty = (next: number) => {
    if (!Number.isFinite(next) || next < 1) {
      setQtyError("");
      onChange({ ...line, qty: 1 });
      return;
    }
    if (next > MAX_LINE_QTY) {
      setQtyError(`Quantity cannot exceed ${MAX_LINE_QTY.toLocaleString("en-IN")}.`);
      onChange({ ...line, qty: MAX_LINE_QTY });
      return;
    }
    setQtyError("");
    onChange({ ...line, qty: Math.floor(next) });
  };
  return <div className={`quote-line ${calculated.excessBps > 0 ? "over" : ""}`}><div className="line-product"><strong>{name}</strong>{variants.length > 0 && <select disabled={!editable} value={line.variantId ?? ""} onChange={(e) => onChange({ ...line, variantId: Number(e.target.value) })}>{variants.map((variant) => <option value={variant.id} key={variant.id}>{variant.attributeName}: {variant.attributeValue}</option>)}</select>}<small>List price {formatMoney(listPricePaise + (variants.find((v) => v.id === line.variantId)?.extraPricePaise ?? 0))}</small></div><div className="qty-wrap"><div className="qty-control"><button disabled={!editable || line.qty <= 1} onClick={() => setQty(line.qty - 1)}><Minus size={14}/></button><input aria-label={`${name} quantity`} disabled={!editable} type="number" min="1" max={MAX_LINE_QTY} value={line.qty} onChange={(e) => setQty(Number(e.target.value))}/><button disabled={!editable || line.qty >= MAX_LINE_QTY} onClick={() => setQty(line.qty + 1)}><Plus size={14}/></button></div>{qtyError ? <small className="field-error">{qtyError}</small> : null}</div><label className="discount-input"><span>Line discount (tier starts at {tierDefaultBps / 100}%)</span><div><input disabled={!editable} type="number" min="0" max="100" step="0.1" value={line.lineDiscountBps / 100} onChange={(e) => onChange({ ...line, lineDiscountBps: Math.round(Number(e.target.value) * 100) })}/><b>%</b></div></label><div className="line-policy"><span>Allowed {formatPercent(calculated.allowedDiscountBps)}</span>{calculated.excessBps > 0 ? <strong>+{calculated.excessBps / 100} pts over</strong> : <em>Within policy</em>}</div><div className="line-net"><span>Net</span><strong>{formatMoney(calculated.netPaise)}</strong></div>{editable && <button className="icon-button" aria-label={`Remove ${name}`} onClick={onRemove}><Trash2 size={16}/></button>}</div>;
}
