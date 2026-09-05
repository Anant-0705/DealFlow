import { z } from "zod";
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());
export const warehouseSchema = z.object({ id: z.coerce.number().int().positive().optional(), name: z.string().trim().min(2), code: z.string().trim().min(2).transform((v) => v.toUpperCase()), shippingCostRupees: z.coerce.number().min(0), replenishmentLeadDays: z.coerce.number().int().min(0), active: checkbox });
export const stockSchema = z.object({
  warehouseId: z.coerce.number().int().positive(),
  productId: z.coerce.number().int().positive(),
  variantId: z.preprocess((v) => v ? Number(v) : null, z.number().int().positive().nullable()),
  onHand: z.coerce.number().int().min(0),
  reorderPoint: z.preprocess((v) => v === "" || v == null ? 0 : v, z.coerce.number().int().min(0)),
  reorderQty: z.preprocess((v) => v === "" || v == null ? 0 : v, z.coerce.number().int().min(0)),
  maxOnHand: z.preprocess((v) => v === "" || v == null ? 0 : v, z.coerce.number().int().min(0)),
});
export const receiptSchema = z.object({ warehouseId: z.coerce.number().int().positive(), productId: z.coerce.number().int().positive(), variantId: z.preprocess((v) => v ? Number(v) : null, z.number().int().positive().nullable()), qty: z.coerce.number().int().positive(), receiptId: z.preprocess((v) => v ? Number(v) : undefined, z.number().int().positive().optional()) });
export const scheduleReceiptSchema = z.object({
  warehouseId: z.coerce.number().int().positive(),
  productId: z.coerce.number().int().positive(),
  variantId: z.preprocess((v) => v ? Number(v) : null, z.number().int().positive().nullable()),
  qty: z.coerce.number().int().positive(),
  expectedAt: z.preprocess((v) => typeof v === "string" && v ? new Date(`${v.slice(0, 10)}T00:00:00.000Z`) : v, z.date()),
});
