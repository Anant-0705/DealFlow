import { z } from "zod";

const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());
export const productSchema = z.object({ id: z.coerce.number().int().positive().optional(), name: z.string().trim().min(2), sku: z.string().trim().min(2).transform((v) => v.toUpperCase()), categoryId: z.coerce.number().int().positive(), unit: z.string().trim().min(1), taxPercent: z.coerce.number().min(0).max(100), listPriceRupees: z.coerce.number().positive(), costRupees: z.coerce.number().min(0), description: z.string().trim().min(3), isSubscription: checkbox, planId: z.preprocess((v) => v ? Number(v) : null, z.number().int().positive().nullable()), isPromoted: checkbox, active: checkbox });
export const variantSchema = z.object({ id: z.coerce.number().int().positive().optional(), productId: z.coerce.number().int().positive(), attributeName: z.string().trim().min(1), attributeValue: z.string().trim().min(1), extraPriceRupees: z.coerce.number().min(0) });
