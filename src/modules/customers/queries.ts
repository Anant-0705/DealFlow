import "server-only";
import { prisma } from "@/lib/prisma";

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
