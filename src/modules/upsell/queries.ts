import "server-only";
import { prisma } from "@/lib/prisma";
import { withCoPurchaseCounts } from "./suggest";

export async function confirmedDealLines() {
  const quotes = await prisma.quote.findMany({
    where: { customerStatus: "CONFIRMED" },
    select: { id: true, currentRevision: { select: { lines: { select: { productId: true } } } } },
  });
  return quotes.flatMap((quote) => (quote.currentRevision?.lines ?? []).map((line) => ({ dealId: quote.id, productId: line.productId })));
}

export async function listPairings() {
  const [pairings, dealLines] = await Promise.all([
    prisma.productPairing.findMany({
      include: { product: true, suggestedProduct: true },
      orderBy: [{ kind: "asc" }, { weight: "desc" }, { id: "asc" }],
    }),
    confirmedDealLines(),
  ]);
  return withCoPurchaseCounts(pairings, dealLines);
}

export const listOfferProducts = () => prisma.product.findMany({
  where: { active: true },
  select: { id: true, name: true },
  orderBy: { name: "asc" },
});

