"use client";
import { useMemo, useState } from "react";
import { proposeCounter } from "@/modules/negotiation/actions";
import { ImpactPreview } from "@/components/quotes/ImpactPreview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney, formatPercent } from "@/lib/money";

type SafeLine = { id: number; description: string; qty: number; unitPricePaise: number; taxBps: number; lineDiscountBps: number };
type DiscountValue = number | "";

export function CounterOfferForm({ quoteCode, currentTotalPaise, orderDiscountBps, lines, disabled }: { quoteCode: string; currentTotalPaise: number; orderDiscountBps: number; lines: SafeLine[]; disabled: boolean }) {
  const [selectedLineIds, setSelectedLineIds] = useState<number[]>([]);
  const [discounts, setDiscounts] = useState<Record<number, DiscountValue>>(() => lines.reduce<Record<number, DiscountValue>>((values, line) => {
    values[line.id] = line.lineDiscountBps / 100;
    return values;
  }, {}));
  const allSelected = lines.length > 0 && selectedLineIds.length === lines.length;
  const proposedTotalPaise = useMemo(() => {
    if (!selectedLineIds.length) return currentTotalPaise;
    const selected = new Set(selectedLineIds);
    return lines.reduce((sum, line) => {
      const lineDiscountBps = selected.has(line.id) ? Math.round(Number(discounts[line.id] ?? 0) * 100) : line.lineDiscountBps;
      const remainingBps = Math.round((10_000 - lineDiscountBps) * (10_000 - orderDiscountBps) / 10_000);
      const effectiveDiscountBps = 10_000 - remainingBps;
      const net = Math.round(line.qty * line.unitPricePaise * (10_000 - effectiveDiscountBps) / 10_000);
      return sum + net + Math.round(net * line.taxBps / 10_000);
    }, 0);
  }, [currentTotalPaise, discounts, lines, orderDiscountBps, selectedLineIds]);

  const toggleLine = (lineId: number) => {
    setSelectedLineIds((current) => current.includes(lineId) ? current.filter((id) => id !== lineId) : [...current, lineId]);
  };

  const toggleAll = () => setSelectedLineIds(allSelected ? [] : lines.map((line) => line.id));

  return <form action={proposeCounter}>
    <Card>
      <CardHeader><CardTitle>Request discount changes</CardTitle><CardDescription>Select one or more products, set the discount you want for each, and send one request.</CardDescription></CardHeader>
      <CardContent className="counter-form">
        <input type="hidden" name="quoteCode" value={quoteCode}/>
        <input type="hidden" name="selectedLineIds" value={selectedLineIds.join(",")}/>
        <FieldGroup>
          <Field>
            <div className="counter-line-heading"><div><FieldLabel>Products to update</FieldLabel><FieldDescription>Choose multiple products if the same request applies to more than one line.</FieldDescription></div><button type="button" className="counter-select-all" onClick={toggleAll} disabled={!lines.length || disabled}>{allSelected ? "Clear all" : "Select all"}</button></div>
            <div className="counter-line-list">
              {lines.map((line) => {
                const selected = selectedLineIds.includes(line.id);
                const checkboxId = `counter-line-${line.id}`;
                return <div className={`counter-line-option${selected ? " selected" : ""}`} key={line.id}>
                  <label className="counter-line-select" htmlFor={checkboxId}><input id={checkboxId} type="checkbox" checked={selected} onChange={() => toggleLine(line.id)} disabled={disabled}/><span className="counter-line-copy"><strong>{line.description}</strong><small>{line.qty} × {formatMoney(line.unitPricePaise)} · Current discount {formatPercent(line.lineDiscountBps, 1)}</small></span></label>
                  <label className="counter-line-discount"><span>Requested discount</span><Input name={`discount-${line.id}`} type="number" min="0" max="100" step="0.1" value={discounts[line.id]} onChange={(event) => setDiscounts((current) => ({ ...current, [line.id]: event.target.value === "" ? "" : Number(event.target.value) }))} disabled={!selected || disabled} required={selected && !disabled} aria-label={`Requested discount for ${line.description}`}/></label>
                </div>;
              })}
            </div>
          </Field>
          <Field><FieldLabel htmlFor="counter-message">Message <span className="muted">(optional)</span></FieldLabel><Textarea id="counter-message" name="text" placeholder="Add context for your sales team" disabled={disabled}/></Field>
        </FieldGroup>
        <ImpactPreview customer current={{ totalPaise: currentTotalPaise }} proposed={{ totalPaise: proposedTotalPaise }}/>
        <SubmitButton variant="outline" disabled={disabled || selectedLineIds.length === 0} pendingLabel="Submitting…">Submit discount request</SubmitButton>
        {disabled ? <FieldDescription>This quotation cannot be changed in its current state.</FieldDescription> : selectedLineIds.length === 0 && <FieldDescription>Select at least one product to submit a discount request.</FieldDescription>}
      </CardContent>
    </Card>
  </form>;
}
