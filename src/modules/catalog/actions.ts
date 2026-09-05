"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { formObject } from "@/lib/validation";
import { productSchema, variantSchema, type ProductFormState } from "./schemas";

export async function saveProduct(_previousState: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const session = await requireRole(["ADMIN"]);
  const parsed = productSchema.safeParse(formObject(formData));
  if (!parsed.success) return {
    status: "error",
    message: "We could not save this product. Review the fields below and try again.",
    fieldErrors: parsed.error.flatten().fieldErrors,
  };
  const value = parsed.data;
  const data = { name: value.name, sku: value.sku, categoryId: value.categoryId, unit: value.unit, taxBps: Math.round(value.taxPercent * 100), listPricePaise: Math.round(value.listPriceRupees * 100), costPaise: Math.round(value.costRupees * 100), description: value.description, isSubscription: value.isSubscription, planId: value.isSubscription ? value.planId : null, isPromoted: value.isPromoted, active: value.active };
  try {
    await prisma.$transaction(async (tx) => {
      const saved = value.id ? await tx.product.update({ where: { id: value.id }, data }) : await tx.product.create({ data });
      await logEvent(tx, { entity: "PRODUCT", entityId: saved.id, action: "SETTINGS_CHANGED", actorId: session.userId, reason: value.id ? "Product updated" : "Product created", meta: data });
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return {
      status: "error",
      message: `The SKU ${value.sku} is already used by another product. Enter a unique SKU.`,
      fieldErrors: { sku: ["This SKU already exists."] },
    };
    throw error;
  }
  revalidatePath("/app/settings/products");
  return { status: "success", message: value.id ? "Product updated successfully." : "Product created successfully." };
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
