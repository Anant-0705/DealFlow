import "server-only";
import { prisma } from "@/lib/prisma";

export function listOrders() {
  return prisma.order.findMany({
    include: { quote: { include: { customer: true } }, lines: { include: { allocations: true, backorders: true } } },
    orderBy: { confirmedAt: "desc" },
  });
}

export function getOrder(code: string) {
  return prisma.order.findUnique({
    where: { code },
    include: {
      quote: { include: { customer: true } },
      revision: true,
      lines: { include: { product: true, variant: true, quoteLine: true, allocations: { include: { warehouse: true } }, backorders: true, subscriptions: { include: { plan: true } } } },
      invoices: { include: { lines: true, payments: true, creditNotes: true } },
      subscriptions: { include: { plan: true, changes: true } },
    },
  });
}
