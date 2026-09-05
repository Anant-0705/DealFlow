export type HealthAlertKind = "STALLED" | "DISCOUNT_ANOMALY" | "DELIVERY_SLIPPAGE";
export type HealthSeverity = "low" | "medium" | "high";

export type HealthAlert = {
  quoteId: number;
  code: string;
  customer: string;
  rep: string;
  ownerId: number;
  kind: HealthAlertKind;
  severity: HealthSeverity;
  reason: string;
  flaggedSince: Date;
  insufficientHistory: boolean;
  orderCode?: string;
  productId?: number;
  variantId?: number | null;
  neededQty?: number;
};

const DAY_MS = 86_400_000;

export type StalledInput = {
  quoteId: number;
  code: string;
  customer: string;
  rep: string;
  ownerId: number;
  approvalStatus: string;
  customerStatus: string;
  fulfillmentStatus: string;
  lastActivityAt: Date;
  lastEvent?: { action: string; actor: string; at: Date } | null;
};

export type DiscountQuoteInput = {
  quoteId: number;
  code: string;
  customer: string;
  rep: string;
  ownerId: number;
  approvalStatus: string;
  customerStatus: string;
  subtotalPaise: number;
  discountPaise: number;
  lastActivityAt: Date;
};

export type SlippageReceipt = {
  expectedAt: Date;
  warehouse: string;
  warehouseId?: number;
  qty: number;
};

export type SlippageInput = {
  quoteId: number;
  code: string;
  customer: string;
  rep: string;
  ownerId: number;
  orderCode: string;
  productId: number;
  variantId: number | null;
  product: string;
  variant: string | null;
  qty: number;
  promisedDeliveryDate: Date;
  backorderCreatedAt: Date;
  receipts: SlippageReceipt[];
};

function dismissed(keySet: ReadonlySet<string> | undefined, quoteId: number, kind: HealthAlertKind) {
  return keySet?.has(`${quoteId}:${kind}`) ?? false;
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(date);
}

function percent(bps: number) {
  return `${Number((bps / 100).toFixed(1))}%`;
}

export function stalled(
  quotes: StalledInput[],
  staleAfterDays: number,
  now = new Date(),
  dismissedKeys?: ReadonlySet<string>,
): HealthAlert[] {
  return quotes.flatMap((quote) => {
    if (quote.customerStatus === "CONFIRMED" || quote.approvalStatus === "REJECTED" || quote.fulfillmentStatus === "FULFILLED") return [];
    const elapsedDays = Math.floor((now.getTime() - quote.lastActivityAt.getTime()) / DAY_MS);
    if (elapsedDays <= staleAfterDays || dismissed(dismissedKeys, quote.quoteId, "STALLED")) return [];
    const event = quote.lastEvent
      ? ` Last event: ${quote.lastEvent.action.replaceAll("_", " ").toLowerCase()} by ${quote.lastEvent.actor} on ${formatDay(quote.lastEvent.at)}.`
      : " No audited activity has been recorded.";
    return [{
      quoteId: quote.quoteId,
      code: quote.code,
      customer: quote.customer,
      rep: quote.rep,
      ownerId: quote.ownerId,
      kind: "STALLED" as const,
      severity: elapsedDays > staleAfterDays * 2 ? "high" as const : "medium" as const,
      reason: `No activity for ${elapsedDays} days (limit ${staleAfterDays}).${event}`,
      flaggedSince: new Date(quote.lastActivityAt.getTime() + staleAfterDays * DAY_MS),
      insufficientHistory: false,
    }];
  });
}

export function discountAnomaly(
  history: DiscountQuoteInput[],
  openQuotes: DiscountQuoteInput[],
  anomalyDeltaBps: number,
  dismissedKeys?: ReadonlySet<string>,
): HealthAlert[] {
  const baselines = new Map<number, { totalBps: number; count: number }>();
  for (const quote of history) {
    if (quote.customerStatus !== "CONFIRMED" || quote.subtotalPaise <= 0) continue;
    const bps = Math.round(quote.discountPaise * 10_000 / quote.subtotalPaise);
    const current = baselines.get(quote.ownerId) ?? { totalBps: 0, count: 0 };
    baselines.set(quote.ownerId, { totalBps: current.totalBps + bps, count: current.count + 1 });
  }

  return openQuotes.flatMap((quote) => {
    if (quote.customerStatus === "CONFIRMED" || quote.approvalStatus === "REJECTED" || quote.subtotalPaise <= 0) return [];
    const baseline = baselines.get(quote.ownerId) ?? { totalBps: 0, count: 0 };
    if (!baseline.count) return [];
    const averageBps = Math.round(baseline.totalBps / baseline.count);
    const currentBps = Math.round(quote.discountPaise * 10_000 / quote.subtotalPaise);
    const deltaBps = currentBps - averageBps;
    if (deltaBps <= anomalyDeltaBps || dismissed(dismissedKeys, quote.quoteId, "DISCOUNT_ANOMALY")) return [];
    const insufficientHistory = baseline.count < 3;
    const reliability = insufficientHistory ? ` Only ${baseline.count} historical ${baseline.count === 1 ? "deal" : "deals"} — baseline unreliable.` : "";
    return [{
      quoteId: quote.quoteId,
      code: quote.code,
      customer: quote.customer,
      rep: quote.rep,
      ownerId: quote.ownerId,
      kind: "DISCOUNT_ANOMALY" as const,
      severity: insufficientHistory ? "low" as const : deltaBps > anomalyDeltaBps * 2 ? "high" as const : "medium" as const,
      reason: `${quote.rep}'s average discount is ${percent(averageBps)} across ${baseline.count} confirmed ${baseline.count === 1 ? "deal" : "deals"}; this quote is ${percent(currentBps)} (+${Number((deltaBps / 100).toFixed(1))} pts, limit +${Number((anomalyDeltaBps / 100).toFixed(1))}).${reliability}`,
      flaggedSince: quote.lastActivityAt,
      insufficientHistory,
    }];
  });
}

export type ReceiptPoolItem = SlippageReceipt & {
  productId: number;
  variantId: number | null;
};

export function assignReceiptsToDemands(
  demands: Array<{ key: string; productId: number; variantId: number | null; qty: number; createdAt: Date }>,
  receipts: ReceiptPoolItem[],
) {
  const pool = receipts.map((receipt) => ({ ...receipt, remaining: receipt.qty }));
  const assigned = new Map<string, SlippageReceipt[]>();
  for (const demand of [...demands].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.key.localeCompare(b.key))) {
    let need = demand.qty;
    const got: SlippageReceipt[] = [];
    for (const receipt of pool
      .filter((item) => item.productId === demand.productId && item.variantId === demand.variantId && item.remaining > 0)
      .toSorted((a, b) => a.expectedAt.getTime() - b.expectedAt.getTime())) {
      const take = Math.min(need, receipt.remaining);
      got.push({ expectedAt: receipt.expectedAt, warehouse: receipt.warehouse, warehouseId: receipt.warehouseId, qty: take });
      receipt.remaining -= take;
      need -= take;
      if (need <= 0) break;
    }
    assigned.set(demand.key, got);
  }
  return assigned;
}

export function coverDemand(needed: number, receipts: SlippageReceipt[], promisedDeliveryDate: Date) {
  let remaining = needed;
  let remainingAfterPromise = needed;
  let covering: SlippageReceipt | undefined;
  for (const receipt of receipts.toSorted((a, b) => a.expectedAt.getTime() - b.expectedAt.getTime())) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, receipt.qty);
    remaining -= take;
    covering = receipt;
    if (receipt.expectedAt <= promisedDeliveryDate) remainingAfterPromise -= take;
  }
  if (remainingAfterPromise <= 0) return { status: "on-time" as const, covering, uncovered: 0 };
  if (remaining <= 0) return { status: "late" as const, covering, uncovered: remainingAfterPromise };
  return { status: "missing" as const, covering, uncovered: remaining };
}

export function deliverySlippage(inputs: SlippageInput[], dismissedKeys?: ReadonlySet<string>): HealthAlert[] {
  return inputs.flatMap((input) => {
    if (dismissed(dismissedKeys, input.quoteId, "DELIVERY_SLIPPAGE")) return [];
    const coverage = coverDemand(input.qty, input.receipts, input.promisedDeliveryDate);
    if (coverage.status === "on-time") return [];
    const item = `${input.qty} × ${input.product}${input.variant ? ` (${input.variant})` : ""} backordered`;
    const reason = coverage.status === "late" && coverage.covering
      ? `${input.orderCode}: ${item}; inbound covering it arrives ${formatDay(coverage.covering.expectedAt)} at ${coverage.covering.warehouse}; promised ${formatDay(input.promisedDeliveryDate)} (${Math.ceil((coverage.covering.expectedAt.getTime() - input.promisedDeliveryDate.getTime()) / DAY_MS)} days late).`
      : coverage.covering
        ? `${input.orderCode}: ${item}; ${coverage.uncovered} still uncovered after scheduled receipts. Next inbound ${formatDay(coverage.covering.expectedAt)} at ${coverage.covering.warehouse}; promised ${formatDay(input.promisedDeliveryDate)}.`
        : `${input.orderCode}: ${item}; no receipt scheduled before the ${formatDay(input.promisedDeliveryDate)} promise date.`;
    return [{
      quoteId: input.quoteId,
      code: input.code,
      customer: input.customer,
      rep: input.rep,
      ownerId: input.ownerId,
      kind: "DELIVERY_SLIPPAGE" as const,
      severity: coverage.status === "missing" ? "high" as const : "medium" as const,
      reason,
      flaggedSince: input.backorderCreatedAt,
      insufficientHistory: false,
      orderCode: input.orderCode,
      productId: input.productId,
      variantId: input.variantId,
      neededQty: coverage.uncovered || input.qty,
    }];
  });
}
