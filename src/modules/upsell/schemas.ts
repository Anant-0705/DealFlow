import { z } from "zod";

const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());

export const pairingSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive(),
  suggestedProductId: z.coerce.number().int().positive(),
  kind: z.enum(["UPSELL", "CROSS_SELL"]),
  weight: z.coerce.number().int().min(1).max(10),
  active: checkbox,
}).refine((value) => value.productId !== value.suggestedProductId, {
  message: "A product cannot suggest itself.",
  path: ["suggestedProductId"],
});

export const dismissOfferSchema = z.object({
  revisionId: z.number().int().positive(),
  kind: z.enum(["UPSELL", "CROSS_SELL"]),
  mode: z.enum(["ADD", "UPGRADE"]),
  productId: z.number().int().positive(),
  variantId: z.number().int().positive().nullable().optional(),
});
