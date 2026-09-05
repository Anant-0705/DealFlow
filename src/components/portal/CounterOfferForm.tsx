"use client";
import { useMemo, useState } from "react";
import { proposeCounter } from "@/modules/negotiation/actions";
import { ImpactPreview } from "@/components/quotes/ImpactPreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type SafeLine = { id: number; description: string; qty: number; unitPricePaise: number; taxBps: number; lineDiscountBps: number };

export function CounterOfferForm({ quoteCode, currentTotalPaise, orderDiscountBps, lines, disabled }: { quoteCode: string; currentTotalPaise: number; orderDiscountBps: number; lines: SafeLine[]; disabled: boolean }) {
  const [lineId, setLineId] = useState(0);
  const [percent, setPercent] = useState(20);
  const proposedTotalPaise = useMemo(() => lines.reduce((sum, line) => {
    const lineDiscountBps = !lineId || line.id === lineId ? Math.round(percent * 100) : line.lineDiscountBps;
    const afterLine = Math.round(line.unitPricePaise * line.qty * (10_000 - lineDiscountBps) / 10_000);
    const net = Math.round(afterLine * (10_000 - orderDiscountBps) / 10_000);
    return sum + net + Math.round(net * line.taxBps / 10_000);
  }, 0), [lineId, lines, orderDiscountBps, percent]);

  return <form action={proposeCounter}><Card><CardHeader><CardTitle>Propose revised terms</CardTitle><CardDescription>See the total change before submitting your request.</CardDescription></CardHeader><CardContent className="counter-form"><input type="hidden" name="quoteCode" value={quoteCode}/><FieldGroup><div className="form-row"><Field><FieldLabel htmlFor="counter-line">Apply to</FieldLabel><NativeSelect id="counter-line" name="lineId" value={lineId} onChange={(event) => setLineId(Number(event.target.value))}><NativeSelectOption value={0}>All lines</NativeSelectOption>{lines.map((line) => <NativeSelectOption value={line.id} key={line.id}>{line.description}</NativeSelectOption>)}</NativeSelect></Field><Field><FieldLabel htmlFor="counter-discount">Proposed discount</FieldLabel><Input id="counter-discount" name="proposedPercent" type="number" min="0" max="100" step="0.1" value={percent} onChange={(event) => setPercent(Number(event.target.value))}/></Field></div><Field><FieldLabel htmlFor="counter-message">Message</FieldLabel><Textarea id="counter-message" name="text" placeholder="Explain what you would like changed"/></Field></FieldGroup><ImpactPreview customer current={{ totalPaise: currentTotalPaise }} proposed={{ totalPaise: proposedTotalPaise }}/><Button variant="outline" disabled={disabled}>Submit request</Button>{disabled && <FieldDescription>This quotation cannot be countered in its current state.</FieldDescription>}</CardContent></Card></form>;
}
