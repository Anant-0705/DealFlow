import { z } from "zod";

const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());
export const productSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(2, "Enter a product name with at least 2 characters."),
  sku: z.string().trim().min(2, "Enter a SKU with at least 2 characters.").transform((v) => v.toUpperCase()),
  categoryId: z.coerce.number().int().positive("Choose a product category."),
  unit: z.string().trim().min(1, "Enter the unit used to sell this product."),
  taxPercent: z.coerce.number().min(0, "Tax cannot be negative.").max(100, "Tax cannot exceed 100%."),
  listPriceRupees: z.coerce.number().positive("List price must be greater than ₹0."),
  costRupees: z.coerce.number().min(0, "Cost cannot be negative."),
  description: z.string().trim().min(3, "Enter a description with at least 3 characters."),
  isSubscription: checkbox,
  planId: z.preprocess((v) => v ? Number(v) : null, z.number().int().positive().nullable()),
  isPromoted: checkbox,
  active: checkbox,
  imageUrl: z.string().trim().nullable().optional(),
  warehouseId: z.preprocess((value) => value === "" || value == null ? null : value, z.coerce.number().int().positive().nullable()),
  openingQty: z.preprocess((value) => value === "" || value == null ? 0 : value, z.coerce.number().int().min(0, "Opening stock cannot be negative.").max(1_000_000, "Opening stock cannot exceed 1,000,000.")),
}).superRefine((value, context) => {
  if (value.isSubscription && !value.planId) context.addIssue({ code: "custom", path: ["planId"], message: "Choose Monthly, Quarterly, or Yearly, or turn off Subscription product." });
  if (!value.id && !value.warehouseId) context.addIssue({ code: "custom", path: ["warehouseId"], message: "Choose the warehouse that will hold this product." });
});

export type ProductFormState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
export const variantSchema = z.object({ id: z.coerce.number().int().positive().optional(), productId: z.coerce.number().int().positive(), attributeName: z.string().trim().min(1), attributeValue: z.string().trim().min(1), extraPriceRupees: z.coerce.number().min(0) });
