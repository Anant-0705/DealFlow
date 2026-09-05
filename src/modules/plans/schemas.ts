import { z } from "zod";
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());
export const planSchema = z.object({ id: z.coerce.number().int().positive().optional(), name: z.string().trim().min(2), interval: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]), prorateChanges: checkbox, creditOnCancel: checkbox });
