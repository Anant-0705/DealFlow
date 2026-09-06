"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const quoteMessageSchema = z.object({ quoteId: z.coerce.number().int().positive(), message: z.string().trim().min(3).max(500) });
const dismissSchema = z.object({ quoteId: z.coerce.number().int().positive(), kind: z.enum(["STALLED", "DISCOUNT_ANOMALY", "DELIVERY_SLIPPAGE"]), reason: z.string().trim().min(3).max(500) });

export async function nudgeRep(formData: FormData) {
  const session = await requireRole(["MANAGER", "FINANCE", "ADMIN"]);
  const input = quoteMessageSchema.parse({ quoteId: formData.get("quoteId"), message: formData.get("message") });
  await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUniqueOrThrow({ where: { id: input.quoteId }, select: { id: true, ownerId: true, code: true } });
    const task = await tx.task.create({ data: { quoteId: quote.id, assigneeId: quote.ownerId, createdById: session.userId, kind: "NUDGE", message: input.message } });
    await logEvent(tx, { entity: "TASK", entityId: task.id, quoteId: quote.id, action: "NUDGE_SENT", actorId: session.userId, reason: input.message, meta: { assigneeId: quote.ownerId } });
  });
  revalidatePath("/app/deal-health");
  revalidatePath("/app/dashboard");
}

export async function escalateToManager(formData: FormData) {
  const session = await requireRole(["MANAGER", "FINANCE", "ADMIN"]);
  const input = quoteMessageSchema.parse({ quoteId: formData.get("quoteId"), message: formData.get("message") });
  const quoteCode = await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUniqueOrThrow({ where: { id: input.quoteId }, select: { id: true, ownerId: true, code: true } });
    const manager = session.role === "MANAGER"
      ? await tx.user.findUniqueOrThrow({ where: { id: session.userId } })
      : await tx.user.findFirstOrThrow({ where: { role: "MANAGER" }, orderBy: { id: "asc" } });
    const task = await tx.task.create({ data: { quoteId: quote.id, assigneeId: manager.id, createdById: session.userId, kind: "ESCALATION", message: input.message } });
    await tx.quote.update({ where: { id: quote.id }, data: { ownerId: manager.id } });
    await logEvent(tx, { entity: "TASK", entityId: task.id, quoteId: quote.id, action: "ESCALATED", actorId: session.userId, reason: input.message, meta: { previousOwnerId: quote.ownerId, managerId: manager.id } });
    return quote.code;
  });
  revalidatePath("/app/deal-health");
  revalidatePath("/app/dashboard");
  revalidatePath(`/app/quotations/${quoteCode}`);
}

export async function dismissAlert(formData: FormData) {
  const session = await requireRole(["MANAGER", "FINANCE", "ADMIN"]);
  const input = dismissSchema.parse({ quoteId: formData.get("quoteId"), kind: formData.get("kind"), reason: formData.get("reason") });
  await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUniqueOrThrow({ where: { id: input.quoteId }, select: { id: true } });
    await logEvent(tx, { entity: "QUOTE", entityId: quote.id, quoteId: quote.id, action: "ALERT_DISMISSED", actorId: session.userId, reason: input.reason, meta: { kind: input.kind, suppressDays: 7 } });
  });
  revalidatePath("/app/deal-health");
  revalidatePath("/app/dashboard");
}

export async function completeTask(formData: FormData) {
  const session = await requireRole(["REP", "MANAGER", "FINANCE", "ADMIN"]);
  const taskId = z.coerce.number().int().positive().parse(formData.get("taskId"));
  const completed = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirstOrThrow({ where: { id: taskId, assigneeId: session.userId, done: false } });
    await tx.task.update({ where: { id: task.id }, data: { done: true } });
    await logEvent(tx, { entity: "TASK", entityId: task.id, quoteId: task.quoteId, action: "TASK_COMPLETED", actorId: session.userId, reason: task.message, meta: { kind: task.kind } });
    return { quoteId: task.quoteId, kind: task.kind };
  });
  revalidatePath("/app/dashboard");
  revalidatePath("/app/deal-health");
  const quote = await prisma.quote.findUnique({ where: { id: completed.quoteId }, select: { code: true, orders: { select: { code: true }, orderBy: { confirmedAt: "desc" }, take: 1 } } });
  if (quote) {
    revalidatePath(`/app/quotations/${quote.code}`);
    revalidatePath(`/portal/quotes/${quote.code}`);
    if (quote.orders[0]) revalidatePath(`/app/fulfillment/${quote.orders[0].code}`);
  }
}
