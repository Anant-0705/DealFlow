"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { formObject } from "@/lib/validation";
import { stockSchema, warehouseSchema } from "./schemas";

export async function saveWarehouse(formData: FormData) {
  const session = await requireRole(["ADMIN"]); const value = warehouseSchema.parse(formObject(formData));
  const data = { name: value.name, code: value.code, shippingCostWeightPaise: Math.round(value.shippingCostRupees * 100), replenishmentLeadDays: value.replenishmentLeadDays, active: value.active };
  await prisma.$transaction(async (tx) => { const row = value.id ? await tx.warehouse.update({ where: { id: value.id }, data }) : await tx.warehouse.create({ data }); await logEvent(tx, { entity: "WAREHOUSE", entityId: row.id, action: "SETTINGS_CHANGED", actorId: session.userId, reason: value.id ? "Warehouse updated" : "Warehouse created", meta: data }); });
  revalidatePath("/app/settings/warehouses");
}

export async function saveStock(formData: FormData) {
  const session = await requireRole(["ADMIN"]); const value = stockSchema.parse(formObject(formData));
  await prisma.$transaction(async (tx) => {
    const existing = await tx.stock.findFirst({ where: { warehouseId: value.warehouseId, productId: value.productId, variantId: value.variantId } });
    const row = existing ? await tx.stock.update({ where: { id: existing.id }, data: { onHand: value.onHand } }) : await tx.stock.create({ data: { ...value, reserved: 0 } });
    await logEvent(tx, { entity: "STOCK", entityId: row.id, action: "SETTINGS_CHANGED", actorId: session.userId, reason: "On-hand stock updated", meta: { onHand: value.onHand } });
  });
  revalidatePath("/app/settings/warehouses");
}
