import "server-only";
import { prisma } from "@/lib/prisma";

export function listQuotes() {
  return prisma.quote.findMany({ include: { customer: true, owner: true, currentRevision: true }, orderBy: { lastActivityAt: "desc" } });
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

export const listForKanban = listQuotes;

export async function getBuilderData() {
  const [customers, products, policy, pairings, stock, warehouses] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { active: true }, include: { category: true, variants: true, plan: true }, orderBy: [{ category: { name: "asc" } }, { name: "asc" }] }),
    prisma.discountPolicy.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.productPairing.findMany({ include: { suggestedProduct: { include: { category: true, variants: true, plan: true } } } }),
    prisma.stock.findMany({ select: { warehouseId: true, productId: true, variantId: true, onHand: true, reserved: true } }),
    prisma.warehouse.findMany({ where: { active: true }, select: { id: true, name: true, shippingCostWeightPaise: true } }),
  ]);
  return { customers, products, policy, pairings, stock, warehouses };
}
