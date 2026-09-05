import { z } from "zod";

export const draftSchema = z.object({
  quoteId: z.number().int().positive(),
  orderDiscountBps: z.number().int().min(0).max(10_000),
  lines: z.array(z.object({ productId: z.number().int().positive(), variantId: z.number().int().positive().nullable().optional(), qty: z.number().int().positive().max(10_000), lineDiscountBps: z.number().int().min(0).max(10_000) })).max(100),
  auditAction: z.enum(["SAVE", "UPSELL_ADDED"]).optional(),
  upsellProductId: z.number().int().positive().optional(),
});

export type DraftInput = z.infer<typeof draftSchema>;
