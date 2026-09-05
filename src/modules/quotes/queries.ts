import "server-only";
import { prisma } from "@/lib/prisma";
import { confirmedDealLines } from "@/modules/upsell/queries";
import { withCoPurchaseCounts } from "@/modules/upsell/suggest";

export function listQuotes(ownerId?: number) {
  return prisma.quote.findMany({ where: ownerId ? { ownerId } : undefined, include: { customer: true, owner: true, currentRevision: true }, orderBy: { lastActivityAt: "desc" } });
}

export function listCommandQuotes() {
  return prisma.quote.findMany({ select: { code: true, customer: { select: { name: true } } }, orderBy: { lastActivityAt: "desc" }, take: 40 });
}

export function getQuoteDetail(code: string) {
  return prisma.quote.findUnique({ where: { code }, include: {
    customer: true, owner: true,
    currentRevision: { include: { lines: { include: { product: { include: { category: true, variants: true, plan: true } }, variant: true } }, approvalSteps: { include: { actor: true }, orderBy: { sequence: "asc" } } } },
    revisions: { include: { lines: { include: { product: true, variant: true } }, approvalSteps: { include: { actor: true }, orderBy: { sequence: "asc" } } }, orderBy: { version: "desc" } },
    auditEvents: { include: { actor: true }, orderBy: { at: "desc" } },
    messages: { include: { customerUser: true, line: true }, orderBy: { createdAt: "asc" } },
    orders: { orderBy: { confirmedAt: "desc" } },
  } });
}

export function getQuoteForPrint(code: string) {
  return prisma.quote.findUnique({
    where: { code },
    include: {
      customer: true,
      owner: true,
      currentRevision: { include: { lines: { include: { variant: true } } } },
      orders: { select: { code: true, confirmedAt: true }, orderBy: { confirmedAt: "desc" }, take: 1 },
    },
  });
}

export const listForKanban = listQuotes;

export async function getBuilderData() {
  const [customers, products, policy, pairings, stock, warehouses, dealLines] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { active: true }, include: { category: true, variants: true, plan: true }, orderBy: [{ category: { name: "asc" } }, { name: "asc" }] }),
    prisma.discountPolicy.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.productPairing.findMany({ where: { active: true, suggestedProduct: { active: true } }, include: { suggestedProduct: { include: { category: true, variants: true, plan: true } } } }),
    prisma.stock.findMany({ select: { warehouseId: true, productId: true, variantId: true, onHand: true, reserved: true } }),
    prisma.warehouse.findMany({ where: { active: true }, select: { id: true, name: true, shippingCostWeightPaise: true, replenishmentLeadDays: true } }),
    confirmedDealLines(),
  ]);
  return { customers, products, policy, pairings: withCoPurchaseCounts(pairings, dealLines), stock, warehouses };
}
