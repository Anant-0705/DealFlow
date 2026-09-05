import type { Prisma } from "@/generated/prisma/client";
import { hashToken, INVITE_TTL_MS, newToken } from "@/lib/tokens";

export async function issueInvite(tx: Prisma.TransactionClient, customerId: number, email: string, createdById: number) {
  const token = newToken();
  const now = new Date();
  await tx.customerInvite.updateMany({ where: { customerId, email, acceptedAt: null, revokedAt: null }, data: { revokedAt: now } });
  await tx.customerInvite.create({
    data: { customerId, email, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + INVITE_TTL_MS), createdById },
  });
  return token;
}
