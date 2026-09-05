export type SuggestionProduct = { id: number; name: string; listPricePaise: number; costPaise: number; isPromoted: boolean };
export type Pairing = { productId: number; suggestedProduct: SuggestionProduct; weight: number; coPurchaseCount?: number };

export function suggestions(currentProductIds: number[], pairings: Pairing[], marginFloorBps: number, dismissed: number[] = []) {
  const current = new Set(currentProductIds); const hidden = new Set(dismissed);
  const ranked = new Map<number, SuggestionProduct & { score: number; marginBps: number }>();
  for (const pairing of pairings) {
    const product = pairing.suggestedProduct;
    const marginBps = product.listPricePaise ? Math.round((product.listPricePaise - product.costPaise) * 10_000 / product.listPricePaise) : 0;
    if (!current.has(pairing.productId) || current.has(product.id) || hidden.has(product.id) || marginBps < marginFloorBps) continue;
    const score = pairing.weight * 10 + (pairing.coPurchaseCount ?? 0) + (product.isPromoted ? 15 : 0);
    const old = ranked.get(product.id);
    if (!old || score > old.score) ranked.set(product.id, { ...product, score, marginBps });
  }
  return [...ranked.values()].sort((a, b) => b.score - a.score).slice(0, 3);
}
