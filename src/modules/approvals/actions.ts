"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";

const actionSchema = z.object({ stepId: z.coerce.number().int().positive(), reason: z.string().trim().min(3).max(500) });

async function getAuthorizedStep(formData: FormData) {
  const session = await requireRole(["MANAGER", "FINANCE", "ADMIN"]);
  const input = actionSchema.parse(Object.fromEntries(formData));
  const step = await prisma.approvalStep.findUniqueOrThrow({ where: { id: input.stepId }, include: { revision: { include: { quote: true, approvalSteps: true } } } });
  if (session.role !== "ADMIN" && (step.level === "FINANCE" ? session.role !== "FINANCE" : session.role !== "MANAGER")) throw new Error("Your role does not match this approval step.");
  if (step.status !== "PENDING") throw new Error("This approval step is no longer pending.");
  const previous = step.revision.approvalSteps.filter((item) => item.sequence < step.sequence);
  if (previous.some((item) => item.status !== "APPROVED")) throw new Error("The previous approval step must be approved first.");
  return { input, step, session };
}

export async function approve(formData: FormData) {
  const { input, step, session } = await getAuthorizedStep(formData);
  await prisma.$transaction(async (tx) => {
    await tx.approvalStep.update({ where: { id: step.id }, data: { status: "APPROVED", actorId: session.userId, actedAt: new Date(), reason: input.reason } });
    const remaining = await tx.approvalStep.count({ where: { revisionId: step.revisionId, id: { not: step.id }, status: "PENDING" } });
    await tx.quote.update({ where: { id: step.revision.quoteId }, data: { approvalStatus: remaining ? "PENDING" : "APPROVED", lastActivityAt: new Date() } });
    await logEvent(tx, { entity: "APPROVAL", entityId: step.id, quoteId: step.revision.quoteId, action: "APPROVED", actorId: session.userId, reason: input.reason, meta: { level: step.level, sequence: step.sequence } });
  });
  revalidatePath("/app");
}

export async function returnForRevision(formData: FormData) {
  const { input, step, session } = await getAuthorizedStep(formData);
  await prisma.$transaction(async (tx) => {
    await tx.approvalStep.update({ where: { id: step.id }, data: { status: "RETURNED", actorId: session.userId, actedAt: new Date(), reason: input.reason } });
    await tx.approvalStep.updateMany({ where: { revisionId: step.revisionId, sequence: { gt: step.sequence } }, data: { status: "STALE" } });
    await tx.quote.update({ where: { id: step.revision.quoteId }, data: { approvalStatus: "NONE", lastActivityAt: new Date() } });
    await logEvent(tx, { entity: "APPROVAL", entityId: step.id, quoteId: step.revision.quoteId, action: "RETURNED", actorId: session.userId, reason: input.reason, meta: { level: step.level } });
  });
  revalidatePath("/app");
}

export async function reject(formData: FormData) {
  const { input, step, session } = await getAuthorizedStep(formData);
  await prisma.$transaction(async (tx) => {
    await tx.approvalStep.update({ where: { id: step.id }, data: { status: "REJECTED", actorId: session.userId, actedAt: new Date(), reason: input.reason } });
    await tx.approvalStep.updateMany({ where: { revisionId: step.revisionId, sequence: { gt: step.sequence } }, data: { status: "STALE" } });
    await tx.quote.update({ where: { id: step.revision.quoteId }, data: { approvalStatus: "REJECTED", lastActivityAt: new Date() } });
    await logEvent(tx, { entity: "APPROVAL", entityId: step.id, quoteId: step.revision.quoteId, action: "REJECTED", actorId: session.userId, reason: input.reason, meta: { level: step.level } });
  });
  revalidatePath("/app");
}
