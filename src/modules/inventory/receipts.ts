import type { Prisma } from "@/generated/prisma/client";

export function findConsolidatableBackorders(db: Prisma.TransactionClient, productId: number, variantId: number | null) {
  return db.backorder.findMany({
    where: { consolidatedAt: null, qty: { gt: 0 }, orderLine: { productId, variantId } },
    include: { orderLine: { include: { order: true, product: true } } },
    orderBy: { createdAt: "asc" },
  });
}
