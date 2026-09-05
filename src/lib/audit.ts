import type { AuditAction, Prisma } from "@/generated/prisma/client";

type AuditDb = Prisma.TransactionClient;

export function logEvent(
  db: AuditDb,
  event: {
    entity: string;
    entityId: number;
    quoteId?: number | null;
    action: AuditAction;
    actorId?: number | null;
    reason?: string | null;
    meta?: Prisma.InputJsonValue;
  },
) {
  return db.auditEvent.create({
    data: {
      ...event,
      quoteId: event.quoteId ?? null,
      actorId: event.actorId ?? null,
      reason: event.reason ?? null,
      meta: event.meta ?? {},
    },
  });
}
