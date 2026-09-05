"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { formObject } from "@/lib/validation";
import { planSchema } from "./schemas";
export async function savePlan(formData: FormData) {
  const session = await requireRole(["ADMIN"]); const value = planSchema.parse(formObject(formData));
  const data = { name: value.name, interval: value.interval, prorateChanges: value.prorateChanges, creditOnCancel: value.creditOnCancel };
  await prisma.$transaction(async (tx) => { const row = value.id ? await tx.subscriptionPlan.update({ where: { id: value.id }, data }) : await tx.subscriptionPlan.create({ data }); await logEvent(tx, { entity: "PLAN", entityId: row.id, action: "SETTINGS_CHANGED", actorId: session.userId, reason: value.id ? "Plan updated" : "Plan created", meta: data }); });
  revalidatePath("/app/settings/plans");
}
