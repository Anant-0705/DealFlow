import "server-only";
import { prisma } from "@/lib/prisma";

export async function getTimeline(quoteId: number) {
  const events = await prisma.auditEvent.findMany({ where: { quoteId }, include: { actor: true }, orderBy: { at: "asc" } });
  return events.map((event) => ({ id: event.id, action: event.action, actor: event.actor?.name ?? "System", at: event.at, reason: event.reason, meta: event.meta }));
}
