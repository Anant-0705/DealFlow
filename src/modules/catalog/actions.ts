"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { formObject } from "@/lib/validation";
import { productSchema, variantSchema } from "./schemas";

export async function saveProduct(formData: FormData) {
  const session = await requireRole(["ADMIN"]); const value = productSchema.parse(formObject(formData));
  if (value.isSubscription && !value.planId) throw new Error("Choose a subscription plan.");
  const data = { name: value.name, sku: value.sku, categoryId: value.categoryId, unit: value.unit, taxBps: Math.round(value.taxPercent * 100), listPricePaise: Math.round(value.listPriceRupees * 100), costPaise: Math.round(value.costRupees * 100), description: value.description, isSubscription: value.isSubscription, planId: value.isSubscription ? value.planId : null, isPromoted: value.isPromoted, active: value.active };
  const row = await prisma.$transaction(async (tx) => {
    const saved = value.id ? await tx.product.update({ where: { id: value.id }, data }) : await tx.product.create({ data });
    await logEvent(tx, { entity: "PRODUCT", entityId: saved.id, action: "SETTINGS_CHANGED", actorId: session.userId, reason: value.id ? "Product updated" : "Product created", meta: data });
    return saved;
  });
  revalidatePath("/app/settings/products"); void row;
}

export async function saveVariant(formData: FormData) {
  const session = await requireRole(["ADMIN"]); const value = variantSchema.parse(formObject(formData));
  const data = { productId: value.productId, attributeName: value.attributeName, attributeValue: value.attributeValue, extraPricePaise: Math.round(value.extraPriceRupees * 100) };
  await prisma.$transaction(async (tx) => {
    const saved = value.id ? await tx.productVariant.update({ where: { id: value.id }, data }) : await tx.productVariant.create({ data });
    await logEvent(tx, { entity: "PRODUCT_VARIANT", entityId: saved.id, action: "SETTINGS_CHANGED", actorId: session.userId, reason: value.id ? "Variant updated" : "Variant created", meta: data });
  });
  revalidatePath(`/app/settings/products/${value.productId}`);
}
