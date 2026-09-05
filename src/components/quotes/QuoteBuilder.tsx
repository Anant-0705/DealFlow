"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Save, Send, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { evaluateRevision } from "@/modules/pricing/engine";
import { suggestions as rankSuggestions } from "@/modules/upsell/suggest";
import { dismissUpsell, reviseQuote, saveDraft, submitForApproval } from "@/modules/quotes/actions";
import { LineRow, type BuilderLine } from "./LineRow";
import { TotalsPanel } from "./TotalsPanel";
import { DecisionPanel } from "./DecisionPanel";
import { UpsellPanel } from "./UpsellPanel";
import { ImpactPreview } from "./ImpactPreview";
import { computeImpact } from "@/modules/preview/impact";
import { calendarPeriod, prorate } from "@/modules/billing/prorate";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Product = { id: number; name: string; categoryId: number; unit: string; taxBps: number; listPricePaise: number; costPaise: number; isPromoted: boolean; isSubscription: boolean; plan: { id: number; interval: "MONTHLY" | "QUARTERLY" | "YEARLY"; prorateChanges: boolean; creditOnCancel: boolean } | null; category: { id: number; name: string; discountCeilingBps: number }; variants: Array<{ id: number; attributeName: string; attributeValue: string; extraPricePaise: number }> };
type Policy = { tierCeilingBronzeBps: number; tierCeilingSilverBps: number; tierCeilingGoldBps: number; financeLineExcessBps: number; financeBlendedExcessBps: number; financeExcessValuePaise: number; upsellMarginFloorBps: number };
type Pairing = { productId: number; weight: number; suggestedProduct: Product };

export function QuoteBuilder({ quote, products, policy, pairings, stock, warehouses, previewDate, canEdit }: { quote: { id: number; code: string; approvalStatus: string; customer: { name: string; tier: "BRONZE" | "SILVER" | "GOLD" }; currentRevision: { id: number; version: number; orderDiscountBps: number; submittedAt: string | Date | null; dismissedUpsellIds: unknown; totalPaise: number; marginPaise: number; marginBps: number; requiredLevel: string; lines: Array<{ productId: number; variantId: number | null; qty: number; unitPricePaise: number; lineDiscountBps: number }> } }; products: Product[]; policy: Policy; pairings: Pairing[]; stock: Array<{ warehouseId: number; productId: number; variantId: number | null; onHand: number; reserved: number }>; warehouses: Array<{ id: number; name: string; shippingCostWeightPaise: number }>; previewDate: string; canEdit: boolean }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const revision = quote.currentRevision;
  const tierBps = quote.customer.tier === "BRONZE" ? policy.tierCeilingBronzeBps : quote.customer.tier === "SILVER" ? policy.tierCeilingSilverBps : policy.tierCeilingGoldBps;
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const initialLines = revision.lines.map((line) => {
    const product = productMap.get(line.productId);
    const variant = product?.variants.find((item) => item.id === line.variantId);
    const listPricePaise = (product?.listPricePaise ?? line.unitPricePaise) + (variant?.extraPricePaise ?? 0);
    const legacyNetPaise = Math.round(line.unitPricePaise * (10_000 - line.lineDiscountBps) / 10_000);
    const legacyLineDiscountBps = line.unitPricePaise < listPricePaise
      ? Math.max(0, Math.min(10_000, Math.round(10_000 - legacyNetPaise * 10_000 / listPricePaise)))
      : line.lineDiscountBps;
    return { productId: line.productId, variantId: line.variantId, qty: line.qty, lineDiscountBps: legacyLineDiscountBps };
  });
  const [lines, setLines] = useState<BuilderLine[]>(initialLines); const [orderDiscountBps, setOrderDiscountBps] = useState(revision.orderDiscountBps); const [category, setCategory] = useState("All"); const [query, setQuery] = useState(""); const [notice, setNotice] = useState(""); const [dismissed, setDismissed] = useState<number[]>(Array.isArray(revision.dismissedUpsellIds) ? revision.dismissedUpsellIds.filter((id): id is number => typeof id === "number") : []);
  const [submitting, setSubmitting] = useState(false); const [submittedLevel, setSubmittedLevel] = useState<"NONE" | "MANAGER" | "FINANCE" | null>(null);
  const editable = canEdit && submittedLevel === null && ["NONE", "STALE"].includes(quote.approvalStatus) && !revision.submittedAt;
  const engineLines = lines.map((line) => { const product = productMap.get(line.productId)!; const variant = product.variants.find((item) => item.id === line.variantId); return { key: `${product.id}:${variant?.id ?? "base"}`, description: product.name, categoryId: product.categoryId, categoryName: product.category.name, categoryCeilingBps: product.category.discountCeilingBps, qty: line.qty, unitPricePaise: product.listPricePaise + (variant?.extraPricePaise ?? 0), unitCostPaise: product.costPaise, taxBps: product.taxBps, lineDiscountBps: line.lineDiscountBps }; });
  const evaluation = evaluateRevision({ customerTier: quote.customer.tier, policy, orderDiscountBps, lines: engineLines });
  const listSubtotal = evaluation.subtotalPaise;
  const afterLineDiscountPaise = evaluation.lines.reduce((sum, line) => sum + Math.round(line.basePaise * (10_000 - line.lineDiscountBps) / 10_000), 0);
  const lineDiscountPaise = evaluation.subtotalPaise - afterLineDiscountPaise;
  const orderDiscountPaise = afterLineDiscountPaise - (evaluation.totalPaise - evaluation.taxPaise);
  const visibleProducts = products.filter((product) => (category === "All" || product.category.name === category) && product.name.toLowerCase().includes(query.toLowerCase()));
  const ranked = rankSuggestions(lines.map((line) => line.productId), pairings.map((pairing) => ({ ...pairing, suggestedProduct: pairing.suggestedProduct })), policy.upsellMarginFloorBps, dismissed);
  const upsells = ranked.map((item) => { const product = productMap.get(item.id)!; const nextLines = [...engineLines, { key: `${product.id}:base`, description: product.name, categoryId: product.categoryId, categoryName: product.category.name, categoryCeilingBps: product.category.discountCeilingBps, qty: 1, unitPricePaise: product.listPricePaise, unitCostPaise: product.costPaise, taxBps: product.taxBps, lineDiscountBps: tierBps }]; const next = evaluateRevision({ customerTier: quote.customer.tier, policy, orderDiscountBps, lines: nextLines }); return { id: product.id, name: product.name, pricePaise: Math.round(product.listPricePaise * (10_000 - tierBps) / 10_000), marginDeltaPaise: next.marginPaise - evaluation.marginPaise, resultingMarginBps: next.marginBps, isPromoted: product.isPromoted }; });
  const makeEngineLines = (source: BuilderLine[]) => source.map((line) => { const product = productMap.get(line.productId)!; const variant = product.variants.find((item) => item.id === line.variantId); return { key: `${product.id}:${variant?.id ?? "base"}`, description: product.name, categoryId: product.categoryId, categoryName: product.category.name, categoryCeilingBps: product.category.discountCeilingBps, qty: line.qty, unitPricePaise: product.listPricePaise + (variant?.extraPricePaise ?? 0), unitCostPaise: product.costPaise, taxBps: product.taxBps, lineDiscountBps: line.lineDiscountBps }; });
  const allocationRequests = (source: BuilderLine[]) => source.map((line) => { const product = productMap.get(line.productId)!; const variant = product.variants.find((item) => item.id === line.variantId); return { productId: product.id, variantId: variant?.id ?? null, description: product.name, variantLabel: variant?.attributeValue ?? null, qty: line.qty, requiresStock: !product.isSubscription && product.category.name.toLowerCase() !== "services" }; });
  const firstBill = (source: BuilderLine[], calculated: typeof evaluation) => source.reduce((sum, line, index) => { const product = productMap.get(line.productId)!; if (!product.isSubscription || !product.plan) return sum; const period = calendarPeriod(previewDate, product.plan.interval); const netUnitPaise = Math.round(calculated.lines[index].netPaise / Math.max(1, line.qty)); const first = prorate({ unitAmountPaise: netUnitPaise, qtyDelta: line.qty, effectiveDate: previewDate, periodStart: period.periodStart, periodEnd: period.periodEnd, prorateChanges: product.plan.prorateChanges }); return sum + first.amountPaise + Math.round(first.amountPaise * product.taxBps / 10_000); }, 0);
  const currentEngineLines = makeEngineLines(initialLines);
  const currentEvaluation = evaluateRevision({ customerTier: quote.customer.tier, policy, orderDiscountBps: revision.orderDiscountBps, lines: currentEngineLines });
  const impact = computeImpact({ current: { customerTier: quote.customer.tier, policy, orderDiscountBps: revision.orderDiscountBps, lines: currentEngineLines }, proposed: { customerTier: quote.customer.tier, policy, orderDiscountBps, lines: engineLines }, currentAllocationRequests: allocationRequests(revision.lines), proposedAllocationRequests: allocationRequests(lines), stock, warehouses, currentFirstBillPaise: firstBill(initialLines, currentEvaluation), proposedFirstBillPaise: firstBill(lines, evaluation) });
  const payload = (nextLines = lines) => ({ quoteId: quote.id, orderDiscountBps, lines: nextLines });
  const addProduct = (product: Product, fromUpsell = false) => { const current = lines.find((line) => line.productId === product.id && line.variantId === (product.variants[0]?.id ?? null)); const next = current ? lines.map((line) => line === current ? { ...line, qty: line.qty + 1 } : line) : [...lines, { productId: product.id, variantId: product.variants[0]?.id ?? null, qty: 1, lineDiscountBps: tierBps }]; setLines(next); if (fromUpsell) startTransition(async () => { await saveDraft({ ...payload(next), auditAction: "UPSELL_ADDED", upsellProductId: product.id }); setNotice(`${product.name} added. Total and margin updated.`); router.refresh(); }); };
  const save = () => startTransition(async () => { await saveDraft(payload()); setNotice("Draft saved to Postgres."); router.refresh(); });
  const submit = async () => {
    setSubmitting(true);
    try {
      const result = await submitForApproval(payload());
      setSubmittedLevel(result.requiredLevel);
      setNotice(result.requiredLevel === "NONE" ? "Quote auto-approved. Draft controls are now locked." : "Quote submitted to the approval inbox. Draft controls are now locked.");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };
  const revise = () => startTransition(async () => { await reviseQuote(quote.id); router.refresh(); });
  const dismiss = (id: number) => { setDismissed((value) => [...value, id]); startTransition(async () => { await dismissUpsell(revision.id, id); router.refresh(); }); };
  const displayedStatus = submittedLevel === "NONE" ? "APPROVED" : submittedLevel ? "PENDING" : quote.approvalStatus;
  const statusLabel = editable ? "EDITABLE DRAFT" : displayedStatus === "PENDING" ? "PENDING APPROVAL" : displayedStatus;
  const statusVariant = editable ? "outline" : displayedStatus === "REJECTED" ? "destructive" : displayedStatus === "APPROVED" ? "default" : "secondary";
  return <div><div className="page-header quote-header"><div><Link href="/app/quotations" className="back-link"><ChevronLeft aria-hidden="true"/>Quotations</Link><div className="eyebrow">{quote.customer.name} · {quote.customer.tier} customer</div><h1>{quote.code} <span>v{revision.version}</span></h1></div><div className="header-actions"><Badge variant={statusVariant}>{statusLabel}</Badge>{editable ? <><Button variant="outline" disabled={pending || submitting} onClick={save}><Save data-icon="inline-start"/>Save draft</Button><Button disabled={pending || submitting || !lines.length} onClick={submit}>{submitting ? <><Send data-icon="inline-start"/>Submitting…</> : evaluation.requiredLevel === "NONE" ? <><Check data-icon="inline-start"/>Confirm, no approval needed</> : <><Send data-icon="inline-start"/>Submit for approval</>}</Button></> : canEdit ? <Button disabled={pending} onClick={revise}><ShieldCheck data-icon="inline-start"/>Revise as v{revision.version + 1}</Button> : null}</div></div>{notice && <Alert><AlertDescription>{notice}</AlertDescription></Alert>}<div className="builder-grid"><div className="builder-main"><section className="panel product-picker"><div className="panel-heading"><div><span className="eyebrow">Catalog</span><h2>Add products</h2></div><div className="search-box"><Search aria-hidden="true"/><Input aria-label="Search products" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products"/></div></div><div className="category-tabs">{["All", ...new Set(products.map((p) => p.category.name))].map((name) => <Button variant={category === name ? "secondary" : "ghost"} size="sm" key={name} onClick={() => setCategory(name)}>{name}</Button>)}</div><div className="product-grid">{visibleProducts.map((product) => <button key={product.id} disabled={!editable} onClick={() => addProduct(product)}><span>{product.category.name}</span><strong>{product.name}</strong><small>₹{(product.listPricePaise / 100).toLocaleString("en-IN")} / {product.unit}</small></button>)}</div></section><section className="panel cart"><div className="panel-heading"><div><span className="eyebrow">Quotation lines</span><h2>{lines.length} {lines.length === 1 ? "item" : "items"}</h2></div><label className="order-discount"><span>Order discount</span><div><input disabled={!editable} type="number" min="0" max="100" step="0.1" value={orderDiscountBps / 100} onChange={(e) => setOrderDiscountBps(Math.round(Number(e.target.value) * 100))}/><b>%</b></div></label></div>{lines.length ? <div className="quote-lines">{lines.map((line, index) => { const product = productMap.get(line.productId)!; return <LineRow key={`${line.productId}-${line.variantId}-${index}`} line={line} calculated={evaluation.lines[index]} name={product.name} listPricePaise={product.listPricePaise} variants={product.variants} tierDefaultBps={tierBps} editable={editable} onChange={(next) => setLines(lines.map((item, i) => i === index ? next : item))} onRemove={() => setLines(lines.filter((_, i) => i !== index))}/>; })}</div> : <div className="empty-cart">Choose a product to begin. Prices and policy decisions update live.</div>}</section></div><aside className="builder-side"><TotalsPanel evaluation={evaluation} listSubtotalPaise={listSubtotal} lineDiscountPaise={lineDiscountPaise} orderDiscountPaise={orderDiscountPaise}/>{editable && <ImpactPreview current={impact.current} proposed={impact.proposed}/>}<DecisionPanel evaluation={evaluation}/><UpsellPanel suggestions={upsells} disabled={!editable || pending || submitting} onAdd={(id) => addProduct(productMap.get(id)!, true)} onDismiss={dismiss}/></aside></div></div>;
}
