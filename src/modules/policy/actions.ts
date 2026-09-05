"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { formObject } from "@/lib/validation";
import { policySchema } from "./schemas";

export async function savePolicy(formData: FormData) {
  const session = await requireRole(["ADMIN", "MANAGER"]); const value = policySchema.parse(formObject(formData));
  const data = { tierCeilingBronzeBps: Math.round(value.tierCeilingBronze * 100), tierCeilingSilverBps: Math.round(value.tierCeilingSilver * 100), tierCeilingGoldBps: Math.round(value.tierCeilingGold * 100), financeLineExcessBps: Math.round(value.financeLineExcess * 100), financeBlendedExcessBps: Math.round(value.financeBlendedExcess * 100), financeExcessValuePaise: Math.round(value.financeExcessValueRupees * 100), staleAfterDays: value.staleAfterDays, anomalyDeltaBps: Math.round(value.anomalyDelta * 100), upsellMarginFloorBps: Math.round(value.upsellMarginFloor * 100) };
  await prisma.$transaction(async (tx) => { await tx.discountPolicy.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data }); await logEvent(tx, { entity: "POLICY", entityId: 1, action: "SETTINGS_CHANGED", actorId: session.userId, reason: "Discount and approval policy updated", meta: data }); });
  revalidatePath("/app/settings/policy");
}

export async function saveCategoryCeiling(formData: FormData) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  const value = z.object({
    categoryId: z.coerce.number().int().positive(),
    discountCeilingPercent: z.coerce.number().min(0).max(100),
  }).parse(formObject(formData));
  const discountCeilingBps = Math.round(value.discountCeilingPercent * 100);
  await prisma.$transaction(async (tx) => {
    const category = await tx.category.update({
      where: { id: value.categoryId },
      data: { discountCeilingBps },
    });
    await logEvent(tx, {
      entity: "CATEGORY",
      entityId: category.id,
      action: "SETTINGS_CHANGED",
      actorId: session.userId,
      reason: `${category.name} discount ceiling updated`,
      meta: { discountCeilingBps },
    });
  });
  revalidatePath("/app/settings/policy");
  revalidatePath("/app/quotations", "layout");
}

export async function savePriceList(formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const value = z.object({ tier: z.enum(["BRONZE", "SILVER", "GOLD"]), name: z.string().trim().min(2), rule: z.enum(["NONE", "PERCENT_OFF"]), valuePercent: z.coerce.number().min(0).max(100) }).parse(formObject(formData));
  const data = { name: value.name, rule: value.rule, valueBps: Math.round(value.valuePercent * 100), currency: "INR" };
  await prisma.$transaction(async (tx) => { const saved = await tx.priceList.upsert({ where: { tier: value.tier }, create: { tier: value.tier, ...data }, update: data }); await logEvent(tx, { entity: "PRICE_LIST", entityId: saved.id, action: "SETTINGS_CHANGED", actorId: session.userId, reason: `${value.tier} price list updated`, meta: data }); });
  revalidatePath("/app/settings/pricing");
}
