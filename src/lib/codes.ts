import type { PrismaClient } from "@/generated/prisma/client";

export async function nextQuoteCode(db: PrismaClient) {
  const last = await db.quote.findFirst({ orderBy: { id: "desc" }, select: { code: true } });
  const numeric = last ? Number(last.code.replace(/\D/g, "")) : 1041;
  return `Q-${Math.max(1042, numeric + 1)}`;
}
