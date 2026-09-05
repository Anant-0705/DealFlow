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
  receipts: Array<{ expectedAt: Date; warehouse: string }>;
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

export function deliverySlippage(inputs: SlippageInput[], dismissedKeys?: ReadonlySet<string>): HealthAlert[] {
  return inputs.flatMap((input) => {
    if (dismissed(dismissedKeys, input.quoteId, "DELIVERY_SLIPPAGE")) return [];
    const nextReceipt = input.receipts.toSorted((a, b) => a.expectedAt.getTime() - b.expectedAt.getTime())[0];
    if (nextReceipt && nextReceipt.expectedAt <= input.promisedDeliveryDate) return [];
    const item = `${input.qty} × ${input.product}${input.variant ? ` (${input.variant})` : ""} backordered`;
    const reason = nextReceipt
      ? `${input.orderCode}: ${item}; next expected receipt ${formatDay(nextReceipt.expectedAt)} at ${nextReceipt.warehouse}; promised ${formatDay(input.promisedDeliveryDate)} (${Math.ceil((nextReceipt.expectedAt.getTime() - input.promisedDeliveryDate.getTime()) / DAY_MS)} days late).`
      : `${input.orderCode}: ${item}; no receipt scheduled before the ${formatDay(input.promisedDeliveryDate)} promise date.`;
    return [{
      quoteId: input.quoteId,
      code: input.code,
      customer: input.customer,
      rep: input.rep,
      ownerId: input.ownerId,
      kind: "DELIVERY_SLIPPAGE" as const,
      severity: nextReceipt ? "medium" as const : "high" as const,
      reason,
      flaggedSince: input.backorderCreatedAt,
      insufficientHistory: false,
    }];
  });
}
