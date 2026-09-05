import "server-only";
import { prisma } from "@/lib/prisma";

export function listQuotes() {
  return prisma.quote.findMany({ include: { customer: true, owner: true, currentRevision: true }, orderBy: { lastActivityAt: "desc" } });
}

export function getQuoteDetail(code: string) {
  return prisma.quote.findUnique({ where: { code }, include: {
    customer: true, owner: true,
    currentRevision: { include: { lines: { include: { product: { include: { category: true, variants: true } }, variant: true } }, approvalSteps: { include: { actor: true }, orderBy: { sequence: "asc" } } } },
    revisions: { include: { approvalSteps: { include: { actor: true }, orderBy: { sequence: "asc" } } }, orderBy: { version: "desc" } },
    auditEvents: { include: { actor: true }, orderBy: { at: "desc" } },
  } });
}

export const listForKanban = listQuotes;

export async function getBuilderData() {
  const [customers, products, policy, priceLists, pairings] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { active: true }, include: { category: true, variants: true }, orderBy: [{ category: { name: "asc" } }, { name: "asc" }] }),
    prisma.discountPolicy.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.priceList.findMany(),
    prisma.productPairing.findMany({ include: { suggestedProduct: { include: { category: true, variants: true } } } }),
  ]);
  return { customers, products, policy, priceLists, pairings };
}
