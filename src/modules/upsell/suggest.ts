export type OfferKind = "UPSELL" | "CROSS_SELL";
export type OfferMode = "ADD" | "UPGRADE";

export type OfferLine = { productId: number; variantId: number | null };
export type OfferVariant = { id: number; attributeName: string; attributeValue: string; extraPricePaise: number };
export type OfferProduct = {
  id: number;
  name: string;
  listPricePaise: number;
  costPaise: number;
  isPromoted: boolean;
  active?: boolean;
  variants: OfferVariant[];
};
export type OfferPairing = {
  productId: number;
  suggestedProductId?: number;
  kind: OfferKind;
  weight: number;
  active?: boolean;
  suggestedProduct: OfferProduct;
  coPurchaseCount?: number;
};

export type DismissedOffers = { upsell: number[]; crossSell: number[]; upgrades: number[] };

export type OfferCard = {
  key: string;
  kind: OfferKind;
  mode: OfferMode;
  productId: number;
  variantId: number | null;
  name: string;
  pricePaise: number;
  costPaise: number;
  score: number;
  marginBps: number;
  isPromoted: boolean;
  reasons: string[];
};

const nums = (value: unknown) => Array.isArray(value) ? value.filter((id): id is number => typeof id === "number") : [];

export function pairKey(productId: number, suggestedProductId: number) {
  return `${productId}:${suggestedProductId}`;
}

export function countCoPurchases(
  pairs: Array<{ productId: number; suggestedProductId: number }>,
  dealLines: Array<{ dealId: number; productId: number }>,
) {
  const productsByDeal = new Map<number, Set<number>>();
  for (const line of dealLines) {
    const set = productsByDeal.get(line.dealId) ?? new Set<number>();
    set.add(line.productId);
    productsByDeal.set(line.dealId, set);
  }
  const counts: Record<string, number> = {};
  for (const pair of pairs) {
    let total = 0;
    for (const products of productsByDeal.values()) {
      if (products.has(pair.productId) && products.has(pair.suggestedProductId)) total += 1;
    }
    counts[pairKey(pair.productId, pair.suggestedProductId)] = total;
  }
  return counts;
}

export function withCoPurchaseCounts<T extends { productId: number; suggestedProductId: number }>(pairings: T[], dealLines: Array<{ dealId: number; productId: number }>) {
  const counts = countCoPurchases(pairings, dealLines);
  return pairings.map((pairing) => ({ ...pairing, coPurchaseCount: counts[pairKey(pairing.productId, pairing.suggestedProductId)] ?? 0 }));
}

export function parseDismissed(raw: unknown): DismissedOffers {
  if (Array.isArray(raw)) return { upsell: nums(raw), crossSell: [], upgrades: [] };
  if (!raw || typeof raw !== "object") return { upsell: [], crossSell: [], upgrades: [] };
  const body = raw as Record<string, unknown>;
  return { upsell: nums(body.upsell), crossSell: nums(body.crossSell), upgrades: nums(body.upgrades) };
}

export function withDismissed(current: DismissedOffers, next: { kind: OfferKind; mode: OfferMode; productId: number; variantId?: number | null }): DismissedOffers {
  if (next.mode === "UPGRADE" && next.variantId) return { ...current, upgrades: [...new Set([...current.upgrades, next.variantId])] };
  if (next.kind === "CROSS_SELL") return { ...current, crossSell: [...new Set([...current.crossSell, next.productId])] };
  return { ...current, upsell: [...new Set([...current.upsell, next.productId])] };
}

function marginBps(pricePaise: number, costPaise: number) {
  return pricePaise ? Math.round((pricePaise - costPaise) * 10_000 / pricePaise) : 0;
}

function extraFor(product: OfferProduct, variantId: number | null) {
  return product.variants.find((variant) => variant.id === variantId)?.extraPricePaise ?? 0;
}

function top(cards: OfferCard[]) {
  return [...cards].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, 3);
}

export function suggestOffers(input: {
  lines: OfferLine[];
  pairings: OfferPairing[];
  products?: OfferProduct[];
  marginFloorBps: number;
  dismissed?: unknown;
}): { upsells: OfferCard[]; crossSells: OfferCard[] } {
  const currentIds = new Set(input.lines.map((line) => line.productId));
  const dismissed = parseDismissed(input.dismissed);
  const hiddenAdd = { UPSELL: new Set(dismissed.upsell), CROSS_SELL: new Set(dismissed.crossSell) };
  const hiddenUpgrades = new Set(dismissed.upgrades);
  const productMap = new Map((input.products ?? []).map((product) => [product.id, product]));
  const addCards = new Map<string, OfferCard>();

  for (const pairing of input.pairings) {
    const product = pairing.suggestedProduct;
    if (pairing.active === false || product.active === false) continue;
    if (!currentIds.has(pairing.productId) || currentIds.has(product.id) || hiddenAdd[pairing.kind].has(product.id)) continue;
    const pricePaise = product.listPricePaise;
    const ownMargin = marginBps(pricePaise, product.costPaise);
    if (ownMargin < input.marginFloorBps) continue;
    const together = pairing.coPurchaseCount ?? 0;
    const score = pairing.weight * 10 + together + (product.isPromoted ? 15 : 0);
    const key = `add:${pairing.kind}:${product.id}`;
    const reasons = [
      `When the quote contains this product, offer ${product.name} as ${pairing.kind === "UPSELL" ? "an upsell" : "a cross-sell"} (weight ${pairing.weight}).`,
      together > 0
        ? `Appeared together on ${together} confirmed ${together === 1 ? "deal" : "deals"}.`
        : "No confirmed deals include both products yet.",
      `Own margin ${(ownMargin / 100).toFixed(0)}% meets the ${(input.marginFloorBps / 100).toFixed(0)}% floor.`,
    ];
    const previous = addCards.get(key);
    if (previous && previous.score >= score) continue;
    addCards.set(key, {
      key,
      kind: pairing.kind,
      mode: "ADD",
      productId: product.id,
      variantId: product.variants[0]?.id ?? null,
      name: product.name,
      pricePaise,
      costPaise: product.costPaise,
      score,
      marginBps: ownMargin,
      isPromoted: product.isPromoted,
      reasons,
    });
  }

  const upgrades: OfferCard[] = [];
  for (const line of input.lines) {
    const product = productMap.get(line.productId);
    if (!product || product.active === false || product.variants.length < 2) continue;
    const currentExtra = extraFor(product, line.variantId);
    const nextVariant = [...product.variants]
      .filter((variant) => variant.extraPricePaise > currentExtra && !hiddenUpgrades.has(variant.id))
      .sort((a, b) => a.extraPricePaise - b.extraPricePaise)[0];
    if (!nextVariant) continue;
    const pricePaise = product.listPricePaise + nextVariant.extraPricePaise;
    const ownMargin = marginBps(pricePaise, product.costPaise);
    if (ownMargin < input.marginFloorBps) continue;
    upgrades.push({
      key: `upgrade:${product.id}:${nextVariant.id}`,
      kind: "UPSELL",
      mode: "UPGRADE",
      productId: product.id,
      variantId: nextVariant.id,
      name: `${product.name} · ${nextVariant.attributeValue}`,
      pricePaise,
      costPaise: product.costPaise,
      score: 120,
      marginBps: ownMargin,
      isPromoted: product.isPromoted,
      reasons: [`Upgrade ${product.name} from the current option to ${nextVariant.attributeName} ${nextVariant.attributeValue}. Same product, higher spec.`],
    });
  }

  const added = [...addCards.values()];
  return {
    upsells: top([...added.filter((card) => card.kind === "UPSELL"), ...upgrades]),
    crossSells: top(added.filter((card) => card.kind === "CROSS_SELL")),
  };
}
