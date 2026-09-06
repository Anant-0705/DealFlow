"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import type { UserRole } from "@/generated/prisma/enums";

const actionSchema = z.object({ stepId: z.coerce.number().int().positive(), reason: z.string().trim().min(3).max(500) });

async function getAuthorizedStep(tx: Parameters<typeof logEvent>[0], stepId: number, role: UserRole) {
  await tx.$queryRawUnsafe<Array<{ id: number }>>('SELECT "id" FROM "ApprovalStep" WHERE "id" = $1 FOR UPDATE', stepId);
  const step = await tx.approvalStep.findUniqueOrThrow({ where: { id: stepId }, include: { revision: { include: { quote: true, approvalSteps: true } } } });
  if (role !== "ADMIN" && (step.level === "FINANCE" ? role !== "FINANCE" : role !== "MANAGER")) throw new Error("Your role does not match this approval step.");
  if (step.status !== "PENDING") throw new Error("This approval step is no longer pending.");
  if (step.revision.quote.currentRevisionId !== step.revisionId) throw new Error("This approval step belongs to a stale revision.");
  const previous = step.revision.approvalSteps.filter((item) => item.sequence < step.sequence);
  if (previous.some((item) => item.status !== "APPROVED")) throw new Error("The previous approval step must be approved first.");
  return step;
}

export async function approve(formData: FormData) {
  const session = await requireRole(["MANAGER", "FINANCE", "ADMIN"]);
  const input = actionSchema.parse(Object.fromEntries(formData));
  let quoteCode = "";
  await prisma.$transaction(async (tx) => {
    const step = await getAuthorizedStep(tx, input.stepId, session.role);
    quoteCode = step.revision.quote.code;
    await tx.approvalStep.update({ where: { id: step.id }, data: { status: "APPROVED", actorId: session.userId, actedAt: new Date(), reason: input.reason } });
    const remaining = await tx.approvalStep.count({ where: { revisionId: step.revisionId, id: { not: step.id }, status: "PENDING" } });
    const isFullyApproved = remaining === 0;
    await tx.quote.update({
      where: { id: step.revision.quoteId },
      data: {
        approvalStatus: isFullyApproved ? "APPROVED" : "PENDING",
        customerStatus: isFullyApproved ? "SENT" : undefined,
        lastActivityAt: new Date(),
      },
    });
    await logEvent(tx, { entity: "APPROVAL", entityId: step.id, quoteId: step.revision.quoteId, action: "APPROVED", actorId: session.userId, reason: input.reason, meta: { level: step.level, sequence: step.sequence } });
    if (isFullyApproved) {
      await logEvent(tx, {
        entity: "QUOTE",
        entityId: step.revision.quoteId,
        quoteId: step.revision.quoteId,
        action: "SENT",
        actorId: session.userId,
        reason: `${step.revision.quote.code} v${step.revision.version} approved and automatically sent to customer.`,
      });
    }
  });
  revalidatePath("/app");
  revalidatePath("/app/quotations");
  revalidatePath("/app/approvals");
  if (quoteCode) {
    revalidatePath(`/app/quotations/${quoteCode}`);
    revalidatePath(`/app/approvals/${quoteCode}`);
    revalidatePath(`/portal/quotes/${quoteCode}`);
  }
}

export async function returnForRevision(formData: FormData) {
  const session = await requireRole(["MANAGER", "FINANCE", "ADMIN"]);
  const input = actionSchema.parse(Object.fromEntries(formData));
  await prisma.$transaction(async (tx) => {
    const step = await getAuthorizedStep(tx, input.stepId, session.role);
    await tx.approvalStep.update({ where: { id: step.id }, data: { status: "RETURNED", actorId: session.userId, actedAt: new Date(), reason: input.reason } });
    await tx.approvalStep.updateMany({ where: { revisionId: step.revisionId, sequence: { gt: step.sequence } }, data: { status: "STALE" } });
    await tx.quoteRevision.update({ where: { id: step.revisionId }, data: { submittedAt: null } });
    await tx.quote.update({ where: { id: step.revision.quoteId }, data: { approvalStatus: "NONE", lastActivityAt: new Date() } });
    await logEvent(tx, { entity: "APPROVAL", entityId: step.id, quoteId: step.revision.quoteId, action: "RETURNED", actorId: session.userId, reason: input.reason, meta: { level: step.level } });
  });
  revalidatePath("/app");
  revalidatePath("/app/quotations");
  revalidatePath("/app/approvals");
}

export async function reject(formData: FormData) {
  const session = await requireRole(["MANAGER", "FINANCE", "ADMIN"]);
  const input = actionSchema.parse(Object.fromEntries(formData));
  await prisma.$transaction(async (tx) => {
    const step = await getAuthorizedStep(tx, input.stepId, session.role);
    await tx.approvalStep.update({ where: { id: step.id }, data: { status: "REJECTED", actorId: session.userId, actedAt: new Date(), reason: input.reason } });
    await tx.approvalStep.updateMany({ where: { revisionId: step.revisionId, sequence: { gt: step.sequence } }, data: { status: "STALE" } });
    await tx.quote.update({ where: { id: step.revision.quoteId }, data: { approvalStatus: "REJECTED", lastActivityAt: new Date() } });
    await logEvent(tx, { entity: "APPROVAL", entityId: step.id, quoteId: step.revision.quoteId, action: "REJECTED", actorId: session.userId, reason: input.reason, meta: { level: step.level } });
  });
  revalidatePath("/app");
}
