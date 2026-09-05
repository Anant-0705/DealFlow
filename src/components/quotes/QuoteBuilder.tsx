"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronLeft, ChevronUp, PackagePlus, Plus, Save, Send, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { evaluateRevision } from "@/modules/pricing/engine";
import { parseDismissed, suggestOffers, type OfferCard, type OfferKind } from "@/modules/upsell/suggest";
import { dismissOffer, reviseQuote, saveDraft, submitForApproval } from "@/modules/quotes/actions";
import { confirmOnBehalf, sendToCustomer } from "@/modules/negotiation/actions";
import { LineRow, type BuilderLine } from "./LineRow";
import { TotalsPanel } from "./TotalsPanel";
import { DecisionPanel } from "./DecisionPanel";
import { OfferPanel } from "./UpsellPanel";
import { ImpactPreview } from "./ImpactPreview";
import { computeImpact } from "@/modules/preview/impact";
import { calendarPeriod, prorate } from "@/modules/billing/prorate";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";

type Product = { id: number; name: string; categoryId: number; unit: string; taxBps: number; listPricePaise: number; costPaise: number; isPromoted: boolean; isSubscription: boolean; plan: { id: number; interval: "MONTHLY" | "QUARTERLY" | "YEARLY"; prorateChanges: boolean; creditOnCancel: boolean } | null; category: { id: number; name: string; discountCeilingBps: number }; variants: Array<{ id: number; attributeName: string; attributeValue: string; extraPricePaise: number }> };
type Policy = { tierCeilingBronzeBps: number; tierCeilingSilverBps: number; tierCeilingGoldBps: number; financeLineExcessBps: number; financeBlendedExcessBps: number; financeExcessValuePaise: number; upsellMarginFloorBps: number };
type Pairing = { productId: number; kind: OfferKind; weight: number; coPurchaseCount?: number; suggestedProduct: Product };

export function QuoteBuilder({ quote, products, policy, pairings, stock, warehouses, previewDate, canEdit }: { quote: { id: number; code: string; approvalStatus: string; customerStatus: string; customer: { name: string; tier: "BRONZE" | "SILVER" | "GOLD" }; currentRevision: { id: number; version: number; orderDiscountBps: number; submittedAt: string | Date | null; dismissedUpsellIds: unknown; totalPaise: number; marginPaise: number; marginBps: number; requiredLevel: string; lines: Array<{ productId: number; variantId: number | null; qty: number; unitPricePaise: number; lineDiscountBps: number }> } }; products: Product[]; policy: Policy; pairings: Pairing[]; stock: Array<{ warehouseId: number; productId: number; variantId: number | null; onHand: number; reserved: number }>; warehouses: Array<{ id: number; name: string; shippingCostWeightPaise: number }>; previewDate: string; canEdit: boolean }) {
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
  const [lines, setLines] = useState<BuilderLine[]>(initialLines);
  const [orderDiscountBps, setOrderDiscountBps] = useState(revision.orderDiscountBps);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(initialLines.length === 0);
  const [productFeedback, setProductFeedback] = useState("");
  const [notice, setNotice] = useState("");
  const [dismissed, setDismissed] = useState(parseDismissed(revision.dismissedUpsellIds));
  const [submitting, setSubmitting] = useState(false); const [submittedLevel, setSubmittedLevel] = useState<"NONE" | "MANAGER" | "FINANCE" | null>(null);
  const editable = canEdit && submittedLevel === null && ["NONE", "STALE"].includes(quote.approvalStatus) && !revision.submittedAt;
  const makeEngineLines = (source: BuilderLine[]) => source.map((line) => { const product = productMap.get(line.productId)!; const variant = product.variants.find((item) => item.id === line.variantId); return { key: `${product.id}:${variant?.id ?? "base"}`, description: product.name, categoryId: product.categoryId, categoryName: product.category.name, categoryCeilingBps: product.category.discountCeilingBps, qty: line.qty, unitPricePaise: product.listPricePaise + (variant?.extraPricePaise ?? 0), unitCostPaise: product.costPaise, taxBps: product.taxBps, lineDiscountBps: line.lineDiscountBps }; });
  const engineLines = makeEngineLines(lines);
  const evaluation = evaluateRevision({ customerTier: quote.customer.tier, policy, orderDiscountBps, lines: engineLines });
  const listSubtotal = evaluation.subtotalPaise;
  const afterLineDiscountPaise = evaluation.lines.reduce((sum, line) => sum + Math.round(line.basePaise * (10_000 - line.lineDiscountBps) / 10_000), 0);
  const lineDiscountPaise = evaluation.subtotalPaise - afterLineDiscountPaise;
  const orderDiscountPaise = afterLineDiscountPaise - (evaluation.totalPaise - evaluation.taxPaise);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleProducts = products.filter((product) =>
    (category === "All" || product.category.name === category) &&
    (!normalizedQuery || product.name.toLowerCase().includes(normalizedQuery) || product.category.name.toLowerCase().includes(normalizedQuery))
  );
  const productQuantities = useMemo(() => {
    const quantities = new Map<number, number>();
    for (const line of lines) quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.qty);
    return quantities;
  }, [lines]);
  const ranked = suggestOffers({
    lines: lines.map((line) => ({ productId: line.productId, variantId: line.variantId })),
    pairings,
    products,
    marginFloorBps: policy.upsellMarginFloorBps,
    dismissed,
  });
  const withImpact = (cards: OfferCard[]) => cards.map((item) => {
    const nextLines = item.mode === "UPGRADE"
      ? lines.map((line) => line.productId === item.productId ? { ...line, variantId: item.variantId } : line)
      : lines.some((line) => line.productId === item.productId && line.variantId === item.variantId)
        ? lines.map((line) => line.productId === item.productId && line.variantId === item.variantId ? { ...line, qty: line.qty + 1 } : line)
        : [...lines, { productId: item.productId, variantId: item.variantId, qty: 1, lineDiscountBps: tierBps }];
    const next = evaluateRevision({ customerTier: quote.customer.tier, policy, orderDiscountBps, lines: makeEngineLines(nextLines) });
    return { ...item, marginDeltaPaise: next.marginPaise - evaluation.marginPaise, resultingMarginBps: next.marginBps };
  });
  const allocationRequests = (source: BuilderLine[]) => source.map((line) => { const product = productMap.get(line.productId)!; const variant = product.variants.find((item) => item.id === line.variantId); return { productId: product.id, variantId: variant?.id ?? null, description: product.name, variantLabel: variant?.attributeValue ?? null, qty: line.qty, requiresStock: !product.isSubscription && product.category.name.toLowerCase() !== "services" }; });
  const firstBill = (source: BuilderLine[], calculated: typeof evaluation) => source.reduce((sum, line, index) => { const product = productMap.get(line.productId)!; if (!product.isSubscription || !product.plan) return sum; const period = calendarPeriod(previewDate, product.plan.interval); const netUnitPaise = Math.round(calculated.lines[index].netPaise / Math.max(1, line.qty)); const first = prorate({ unitAmountPaise: netUnitPaise, qtyDelta: line.qty, effectiveDate: previewDate, periodStart: period.periodStart, periodEnd: period.periodEnd, prorateChanges: product.plan.prorateChanges }); return sum + first.amountPaise + Math.round(first.amountPaise * product.taxBps / 10_000); }, 0);
  const currentEngineLines = makeEngineLines(initialLines);
  const currentEvaluation = evaluateRevision({ customerTier: quote.customer.tier, policy, orderDiscountBps: revision.orderDiscountBps, lines: currentEngineLines });
  const impact = computeImpact({ current: { customerTier: quote.customer.tier, policy, orderDiscountBps: revision.orderDiscountBps, lines: currentEngineLines }, proposed: { customerTier: quote.customer.tier, policy, orderDiscountBps, lines: engineLines }, currentAllocationRequests: allocationRequests(revision.lines), proposedAllocationRequests: allocationRequests(lines), stock, warehouses, currentFirstBillPaise: firstBill(initialLines, currentEvaluation), proposedFirstBillPaise: firstBill(lines, evaluation) });
  const payload = (nextLines = lines) => ({ quoteId: quote.id, orderDiscountBps, lines: nextLines });
  const addProduct = (product: Product) => {
    const defaultVariantId = product.variants[0]?.id ?? null;
    const current = lines.find((line) => line.productId === product.id && line.variantId === defaultVariantId);
    const next = current
      ? lines.map((line) => line === current ? { ...line, qty: line.qty + 1 } : line)
      : [...lines, { productId: product.id, variantId: defaultVariantId, qty: 1, lineDiscountBps: tierBps }];
    setLines(next);
    setProductFeedback(current ? `${product.name} quantity increased.` : `${product.name} added to this quotation.`);
  };
  const applyOffer = (item: OfferCard) => {
    const next = item.mode === "UPGRADE"
      ? lines.map((line) => line.productId === item.productId ? { ...line, variantId: item.variantId } : line)
      : lines.some((line) => line.productId === item.productId && line.variantId === item.variantId)
        ? lines.map((line) => line.productId === item.productId && line.variantId === item.variantId ? { ...line, qty: line.qty + 1 } : line)
        : [...lines, { productId: item.productId, variantId: item.variantId, qty: 1, lineDiscountBps: tierBps }];
    setLines(next);
    startTransition(async () => {
      await saveDraft({
        ...payload(next),
        auditAction: item.kind === "CROSS_SELL" ? "CROSS_SELL_ADDED" : "UPSELL_ADDED",
        offerProductId: item.productId,
        offerVariantId: item.variantId,
        upsellProductId: item.productId,
      });
      setNotice(item.mode === "UPGRADE" ? `${item.name} applied. Totals updated.` : `${item.name} added. Total and margin updated.`);
      router.refresh();
    });
  };
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
  const dismiss = (item: OfferCard) => {
    setDismissed((value) => item.mode === "UPGRADE" && item.variantId
      ? { ...value, upgrades: [...value.upgrades, item.variantId] }
      : item.kind === "CROSS_SELL"
        ? { ...value, crossSell: [...value.crossSell, item.productId] }
        : { ...value, upsell: [...value.upsell, item.productId] });
    startTransition(async () => { await dismissOffer(revision.id, { kind: item.kind, mode: item.mode, productId: item.productId, variantId: item.variantId }); router.refresh(); });
  };
  const displayedStatus = submittedLevel === "NONE" ? "APPROVED" : submittedLevel ? "PENDING" : quote.approvalStatus;
  const statusLabel = editable ? "EDITABLE DRAFT" : displayedStatus === "PENDING" ? "PENDING APPROVAL" : displayedStatus;
  const statusVariant = editable ? "outline" : displayedStatus === "REJECTED" ? "destructive" : displayedStatus === "APPROVED" ? "default" : "secondary";
  const offerDisabled = !editable || pending || submitting;
  return (
    <div className="quote-builder">
      <div className="page-header quote-header">
        <div>
          <Link href="/app/quotations" className="back-link"><ChevronLeft aria-hidden="true"/>Quotations</Link>
          <div className="eyebrow">{quote.customer.name} · {quote.customer.tier} customer</div>
          <h1>{quote.code} <span>v{revision.version}</span></h1>
        </div>
        <div className="header-actions quote-status-actions">
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          {!editable && canEdit ? <Button type="button" disabled={pending} onClick={revise}><ShieldCheck data-icon="inline-start"/>Revise as v{revision.version + 1}</Button> : null}
        </div>
      </div>
      {notice && <Alert><AlertDescription>{notice}</AlertDescription></Alert>}

      <div className="builder-grid builder-grid-focused">
        <div className="builder-main">
          <section className="panel cart quote-editor-panel">
            <div className="panel-heading quotation-lines-heading">
              <div><span className="eyebrow">Quotation lines</span><h2>{lines.length} {lines.length === 1 ? "item" : "items"}</h2></div>
              <div className="cart-heading-actions">
                <div className="quote-line-actions" aria-label="Quotation actions">
                  {editable && <>
                    <Button type="button" variant="outline" disabled={pending || submitting} onClick={save}><Save data-icon="inline-start"/>Save draft</Button>
                    <Button type="button" disabled={pending || submitting || !lines.length} onClick={submit}><Send data-icon="inline-start"/>{submitting ? "Submitting…" : evaluation.requiredLevel === "NONE" ? "Confirm, no approval needed" : "Submit for approval"}</Button>
                  </>}
                  {quote.approvalStatus === "APPROVED" && quote.customerStatus === "SENT" && <Badge variant="secondary"><Check aria-hidden="true"/>Sent to customer</Badge>}
                  {quote.approvalStatus === "APPROVED" && quote.customerStatus !== "CONFIRMED" && quote.customerStatus !== "SENT" && <form action={sendToCustomer}><input type="hidden" name="quoteCode" value={quote.code}/><SubmitButton pendingLabel="Sending…"><Send data-icon="inline-start"/>Send to customer</SubmitButton></form>}
                  {quote.approvalStatus === "APPROVED" && quote.customerStatus !== "CONFIRMED" && <form action={confirmOnBehalf}><input type="hidden" name="quoteCode" value={quote.code}/><input type="hidden" name="revisionId" value={quote.currentRevision.id}/><Button type="submit" variant="outline"><Check data-icon="inline-start"/>Confirm on behalf</Button></form>}
                </div>
                <label className="order-discount"><span>Order discount</span><div><input disabled={!editable} type="number" min="0" max="100" step="0.1" value={orderDiscountBps / 100} onChange={(event) => setOrderDiscountBps(Math.round(Number(event.target.value) * 100))}/><b>%</b></div></label>
              </div>
            </div>

            <div className="inline-product-finder">
              <div className="product-finder-heading">
                <div>
                  <span className="product-finder-title"><PackagePlus aria-hidden="true"/><label htmlFor="quote-product-search">Find and add product</label></span>
                  <small>Search the catalog without leaving your quotation lines.</small>
                </div>
                <label className="product-category-filter">
                  <span>Category</span>
                  <NativeSelect value={category} onChange={(event) => { setCategory(event.target.value); setCatalogOpen(true); }} aria-label="Filter products by category">
                    {["All", ...new Set(products.map((product) => product.category.name))].map((name) => <NativeSelectOption key={name} value={name}>{name}</NativeSelectOption>)}
                  </NativeSelect>
                </label>
              </div>
              <div className="product-finder-controls">
                <InputGroup className="product-finder-input">
                  <InputGroupAddon><Search aria-hidden="true"/></InputGroupAddon>
                  <InputGroupInput id="quote-product-search" value={query} disabled={!editable} onFocus={() => setCatalogOpen(true)} onChange={(event) => { setQuery(event.target.value); setCatalogOpen(true); }} placeholder="Search by product or category" autoComplete="off" aria-controls="quote-product-results" aria-expanded={catalogOpen}/>
                </InputGroup>
                <Button type="button" variant="outline" disabled={!editable} aria-expanded={catalogOpen} aria-controls="quote-product-results" onClick={() => setCatalogOpen((open) => !open)}>
                  {catalogOpen ? "Hide catalog" : "Browse catalog"}
                  {catalogOpen ? <ChevronUp data-icon="inline-end"/> : <ChevronDown data-icon="inline-end"/>}
                </Button>
              </div>
              <p className="product-feedback" role="status" aria-live="polite">{productFeedback}</p>
              {catalogOpen && <div className="inline-product-results" id="quote-product-results" aria-label="Catalog products">
                {visibleProducts.length ? visibleProducts.map((product) => {
                  const quotedQty = productQuantities.get(product.id) ?? 0;
                  return <Button type="button" variant="outline" className="product-result" key={product.id} disabled={!editable} onClick={() => addProduct(product)} aria-label={`Add ${product.name} to quotation`}>
                    <span className="product-result-copy"><small>{product.category.name}</small><strong>{product.name}</strong><span>₹{(product.listPricePaise / 100).toLocaleString("en-IN")} / {product.unit}</span></span>
                    {quotedQty > 0 && <Badge variant="secondary">{quotedQty} in quote</Badge>}
                    <Plus data-icon="inline-end"/>
                  </Button>;
                }) : <div className="product-results-empty" role="status">No products match “{query}”. Try another name or category.</div>}
              </div>}
            </div>

            {lines.length ? <div className="quote-lines">{lines.map((line, index) => { const product = productMap.get(line.productId)!; return <LineRow key={`${line.productId}-${line.variantId}-${index}`} line={line} calculated={evaluation.lines[index]} name={product.name} listPricePaise={product.listPricePaise} variants={product.variants} tierDefaultBps={tierBps} editable={editable} onChange={(next) => setLines(lines.map((item, itemIndex) => itemIndex === index ? next : item))} onRemove={() => setLines(lines.filter((_, itemIndex) => itemIndex !== index))}/>; })}</div> : <div className="empty-cart">Search above and add the first product. Prices and policy decisions update immediately.</div>}
          </section>
        </div>

        <aside className="builder-side">
          <div className="recommendation-stack" aria-label="Deal recommendations">
            {lines.length ? <>
              <OfferPanel title="Upsell" eyebrow="Grow this deal" empty="No upsells for these lines. Add pairings in Settings → Offers, or add a product that has a higher variant." addLabel={(item) => item.mode === "UPGRADE" ? "Upgrade line" : "Add to quote"} suggestions={withImpact(ranked.upsells)} disabled={offerDisabled} onAdd={applyOffer} onDismiss={dismiss} collapsedLimit={1}/>
              <OfferPanel title="Cross-sell" eyebrow="Frequently bought together" empty="No cross-sells for these lines. Create a CROSS-SELL pairing in Settings → Offers." addLabel={() => "Add to quote"} suggestions={withImpact(ranked.crossSells)} disabled={offerDisabled} onAdd={applyOffer} onDismiss={dismiss} collapsedLimit={1}/>
            </> : <section className="panel recommendation-placeholder"><PackagePlus aria-hidden="true"/><div><span className="eyebrow">Upsell and cross-sell</span><h2>Recommendations appear here</h2><p>Add the first product to see the best upgrade and pairing.</p></div></section>}
          </div>
        </aside>
        <section className="builder-insights-grid" aria-label="Quotation commercial insights">
          <TotalsPanel evaluation={evaluation} listSubtotalPaise={listSubtotal} lineDiscountPaise={lineDiscountPaise} orderDiscountPaise={orderDiscountPaise}/>
          <DecisionPanel evaluation={evaluation}/>
          {editable && <ImpactPreview current={impact.current} proposed={impact.proposed}/>}
        </section>
      </div>
    </div>
  );
}
