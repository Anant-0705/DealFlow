import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { canReportUnauthorizedConfirm, parseOnBehalfMeta } from "./on-behalf";

type Db = Prisma.TransactionClient | typeof prisma;

export async function assertNoOpenConfirmationDispute(db: Db, quoteId: number) {
  const open = await db.task.findFirst({ where: { quoteId, kind: "CONFIRMATION_DISPUTE", done: false }, select: { id: true } });
  if (open) throw new Error("The customer reported that they did not authorize this confirmation. Resolve that review before reserving or shipping.");
}

export async function listConfirmationReviewers(db: Db) {
  const users = await db.user.findMany({
    where: { role: { in: ["MANAGER", "FINANCE", "ADMIN"] } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { id: "asc" },
  });
  const manager = users.find((user) => user.role === "MANAGER") ?? users.find((user) => user.role === "ADMIN");
  const finance = users.find((user) => user.role === "FINANCE");
  const reviewers = [manager, finance].filter((user): user is NonNullable<typeof user> => Boolean(user));
  const unique = reviewers.filter((user, index) => reviewers.findIndex((item) => item.id === user.id) === index);
  if (unique.length) return unique;
  if (users[0]) return [users[0]];
  throw new Error("No manager or finance user is available to review this report.");
}

export async function getQuoteTrustState(quoteId: number) {
  const [confirmed, disputes] = await Promise.all([
    prisma.auditEvent.findFirst({
      where: { quoteId, action: "CONFIRMED" },
      orderBy: { at: "desc" },
      include: { actor: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: { quoteId, kind: "CONFIRMATION_DISPUTE" },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const evidence = parseOnBehalfMeta(confirmed?.meta);
  const open = disputes.find((task) => !task.done) ?? null;
  const alreadyReported = disputes.length > 0;
  return {
    confirmedAt: confirmed?.at ?? null,
    actorName: confirmed?.actor?.name ?? null,
    ...evidence,
    alreadyReported,
    disputeOpen: Boolean(open),
    disputeMessage: open?.message ?? disputes[0]?.message ?? null,
    canReport: canReportUnauthorizedConfirm({
      customerStatus: confirmed ? "CONFIRMED" : "DRAFT",
      onBehalf: evidence.onBehalf,
      alreadyReported,
    }),
  };
}
