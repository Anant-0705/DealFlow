"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { formObject } from "@/lib/validation";
import { pairingSchema } from "./schemas";

export async function savePairing(formData: FormData) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  const value = pairingSchema.parse(formObject(formData));
  const data = { productId: value.productId, suggestedProductId: value.suggestedProductId, kind: value.kind, weight: value.weight, active: value.active };
  try {
    await prisma.$transaction(async (tx) => {
      const saved = value.id
        ? await tx.productPairing.update({ where: { id: value.id }, data })
        : await tx.productPairing.create({ data });
      await logEvent(tx, {
        entity: "PRODUCT_PAIRING",
        entityId: saved.id,
        action: "SETTINGS_CHANGED",
        actorId: session.userId,
        reason: value.id ? "Offer pairing updated" : "Offer pairing created",
        meta: data,
      });
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new Error("That product pair already exists. Edit the existing row instead.");
    }
    throw error;
  }
  revalidatePath("/app/settings/upsell");
  revalidatePath("/app/quotations", "layout");
}

export async function deletePairing(formData: FormData) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) throw new Error("Choose a pairing to remove.");
  await prisma.$transaction(async (tx) => {
    await tx.productPairing.delete({ where: { id } });
    await logEvent(tx, { entity: "PRODUCT_PAIRING", entityId: id, action: "SETTINGS_CHANGED", actorId: session.userId, reason: "Offer pairing removed" });
  });
  revalidatePath("/app/settings/upsell");
  revalidatePath("/app/quotations", "layout");
}
