import "server-only";
import { prisma } from "@/lib/prisma";

export function listPortalQuotes(customerId: number) {
  return prisma.quote.findMany({
    where: { customerId, customerStatus: { in: ["SENT", "NEGOTIATING", "CONFIRMED"] } },
    include: { customer: true, currentRevision: true },
    orderBy: { lastActivityAt: "desc" },
  });
}

export function getPortalQuote(customerId: number, code: string) {
  return prisma.quote.findFirst({
    where: { customerId, code, customerStatus: { in: ["SENT", "NEGOTIATING", "CONFIRMED"] } },
    include: {
      customer: true,
      currentRevision: { include: { lines: { include: { product: true, variant: true } } } },
      revisions: { include: { lines: { include: { product: true, variant: true } } }, orderBy: { version: "desc" }, take: 2 },
      messages: { include: { customerUser: true, line: true }, orderBy: { createdAt: "asc" } },
    },
  });
}

export function listPortalMessages(customerId: number) {
  return prisma.quote.findMany({
    where: { customerId, messages: { some: {} }, customerStatus: { in: ["SENT", "NEGOTIATING", "CONFIRMED"] } },
    select: { code: true, customerStatus: true, messages: { include: { customerUser: true, line: true }, orderBy: { createdAt: "asc" } } },
    orderBy: { lastActivityAt: "desc" },
  });
}

export function getPortalProfile(customerId: number) {
  return prisma.customer.findUnique({ where: { id: customerId }, select: { name: true, code: true, tier: true, email: true, notes: true } });
}
