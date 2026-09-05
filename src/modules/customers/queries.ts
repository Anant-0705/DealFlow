import "server-only";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export function listCustomers() {
  return prisma.customer.findMany({
    include: {
      users: { select: { id: true, name: true, email: true, createdAt: true }, orderBy: { name: "asc" } },
      invites: { where: { acceptedAt: null, revokedAt: null }, select: { id: true, email: true, expiresAt: true }, orderBy: { createdAt: "desc" } },
      _count: { select: { quotes: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getOpenInvite(token: string) {
  if (token.trim().length < 32) return null;
  return prisma.customerInvite.findFirst({
    where: { tokenHash: hashToken(token), acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { email: true, expiresAt: true, customer: { select: { name: true } } },
  });
}

export function getCustomerByCode(code: string) {
  return prisma.customer.findUnique({
    where: { code },
    include: {
      users: { select: { id: true, name: true, email: true }, orderBy: { name: "asc" } },
      _count: { select: { quotes: true } },
    },
  });
}
