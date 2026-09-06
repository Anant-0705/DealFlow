"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { formObject } from "@/lib/validation";
import { uploadToStorage } from "@/lib/storage";
import { productSchema, variantSchema, type ProductFormState } from "./schemas";

export async function saveProduct(_previousState: ProductFormState, formData: FormData): Promise<ProductFormState> {
  try {
    const session = await requireRole(["ADMIN"]);
    const parsed = productSchema.safeParse(formObject(formData));
    if (!parsed.success) return {
      status: "error",
      message: "We could not save this product. Review the fields below and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
    const value = parsed.data;

    let imageUrl: string | null | undefined = undefined;
    const imageFile = formData instanceof FormData ? formData.get("image") : null;
    const removeImage = formData instanceof FormData ? formData.get("removeImage") : null;

    if (imageFile instanceof File && imageFile.size > 0) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(imageFile.type)) {
        return {
          status: "error",
          message: "Please upload a PNG, JPEG, or WebP image file.",
          fieldErrors: { image: ["Upload a PNG, JPEG, or WebP image."] },
        };
      }
      try {
        const uploaded = await uploadToStorage({
          file: imageFile,
          filename: imageFile.name,
          contentType: imageFile.type,
          folder: "products",
        });
        imageUrl = uploaded.url;
      } catch {
        return {
          status: "error",
          message: "The product image could not be stored. Save without an image, or check storage settings.",
          fieldErrors: { image: ["Image upload failed."] },
        };
      }
    } else if (removeImage === "on" || removeImage === "true") {
      imageUrl = null;
    }

    const data = {
      name: value.name,
      sku: value.sku,
      categoryId: value.categoryId,
      unit: value.unit,
      taxBps: Math.round(value.taxPercent * 100),
      listPricePaise: Math.round(value.listPriceRupees * 100),
      costPaise: Math.round(value.costRupees * 100),
      description: value.description,
      isSubscription: value.isSubscription,
      planId: value.isSubscription ? value.planId : null,
      isPromoted: value.isPromoted,
      active: value.active,
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    };
    await prisma.$transaction(async (tx) => {
      const saved = value.id ? await tx.product.update({ where: { id: value.id }, data }) : await tx.product.create({ data });
      if (!value.id && value.warehouseId) {
        const warehouse = await tx.warehouse.findFirst({ where: { id: value.warehouseId, active: true }, select: { id: true, name: true } });
        if (!warehouse) throw new Error("WAREHOUSE");
        const existing = await tx.stock.findFirst({ where: { warehouseId: warehouse.id, productId: saved.id, variantId: null } });
        const openingQty = value.openingQty ?? 0;
        const stock = existing
          ? await tx.stock.update({ where: { id: existing.id }, data: { onHand: openingQty } })
          : await tx.stock.create({ data: { warehouseId: warehouse.id, productId: saved.id, variantId: null, onHand: openingQty, reserved: 0 } });
        await logEvent(tx, { entity: "STOCK", entityId: stock.id, action: "SETTINGS_CHANGED", actorId: session.userId, reason: `${openingQty} units added to ${warehouse.name} with the new product.`, meta: { warehouseId: warehouse.id, productId: saved.id, onHand: openingQty } });
      }
      await logEvent(tx, { entity: "PRODUCT", entityId: saved.id, action: "SETTINGS_CHANGED", actorId: session.userId, reason: value.id ? "Product updated" : "Product created", meta: data });
    });
    revalidatePath("/app/settings/products");
    revalidatePath("/app/settings/warehouses");
    revalidatePath("/app/fulfillment");
    if (value.id) {
      revalidatePath(`/app/settings/products/${value.id}`);
    }
    return { status: "success", message: value.id ? "Product updated successfully." : "Product created successfully." };
  } catch (error) {
    if (error instanceof Error && error.message === "WAREHOUSE") return {
      status: "error",
      message: "Choose an active warehouse for the opening stock.",
      fieldErrors: { warehouseId: ["Choose an active warehouse."] },
    };
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const target = "meta" in error && error.meta && typeof error.meta === "object" && "target" in error.meta ? String(error.meta.target) : "";
      if (target.includes("sku")) return {
        status: "error",
        message: "That SKU is already used by another product. Enter a unique SKU.",
        fieldErrors: { sku: ["This SKU already exists."] },
      };
    }
    console.error("saveProduct failed", error);
    return {
      status: "error",
      message: "We could not save this product. Check the details and try again.",
    };
  }
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
