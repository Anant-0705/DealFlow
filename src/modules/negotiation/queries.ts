import "server-only";
import { prisma } from "@/lib/prisma";

export function listPortalQuotes(customerId: number) {
  return prisma.quote.findMany({
    where: { customerId, customerStatus: { in: ["SENT", "NEGOTIATING", "CONFIRMED"] } },
    select: {
      code: true,
      customerStatus: true,
      lastActivityAt: true,
      currentRevision: { select: { version: true, totalPaise: true } },
    },
    orderBy: { lastActivityAt: "desc" },
  });
}

export function getPortalQuote(customerId: number, code: string) {
  return prisma.quote.findFirst({
    where: { customerId, code, customerStatus: { in: ["SENT", "NEGOTIATING", "CONFIRMED"] } },
    select: {
      id: true,
      code: true,
      customerStatus: true,
      approvalStatus: true,
      lastActivityAt: true,
      customer: { select: { name: true, email: true, phone: true, gstin: true, billingAddress: true } },
      currentRevision: { select: {
        id: true,
        version: true,
        createdVia: true,
        orderDiscountBps: true,
        subtotalPaise: true,
        discountPaise: true,
        taxPaise: true,
        totalPaise: true,
        lines: { select: {
          id: true,
          productId: true,
          variantId: true,
          description: true,
          qty: true,
          unitPricePaise: true,
          lineDiscountBps: true,
          netPaise: true,
          product: { select: { taxBps: true } },
          variant: { select: { attributeValue: true } },
        } },
      } },
      revisions: { select: {
        version: true,
        orderDiscountBps: true,
        totalPaise: true,
        lines: { select: { productId: true, variantId: true, description: true, qty: true, lineDiscountBps: true, unitPricePaise: true } },
      }, orderBy: { version: "desc" }, take: 2 },
      messages: { select: {
        id: true,
        revisionId: true,
        message: true,
        proposedDiscountBps: true,
        createdAt: true,
        customerUser: { select: { name: true, role: true } },
        line: { select: { description: true } },
      }, orderBy: { createdAt: "asc" } },
    },
  });
}

export function listPortalMessages(customerId: number) {
  return prisma.quote.findMany({
    where: { customerId, messages: { some: {} }, customerStatus: { in: ["SENT", "NEGOTIATING", "CONFIRMED"] } },
    select: {
      code: true,
      customerStatus: true,
      lastActivityAt: true,
      currentRevision: { select: { version: true, totalPaise: true } },
      messages: { include: { customerUser: true, line: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { lastActivityAt: "desc" },
  });
}

export function getPortalProfile(customerId: number) {
  return prisma.customer.findUnique({ where: { id: customerId }, select: { name: true, code: true, tier: true, email: true, phone: true, gstin: true, billingAddress: true } });
}
