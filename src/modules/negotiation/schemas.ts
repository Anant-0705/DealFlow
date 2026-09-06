import { z } from "zod";
import { CONFIRM_CHANNELS } from "./on-behalf";

const optionalLineIdSchema = z.preprocess((value) => {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return Number(value) === 0 ? null : value;
}, z.coerce.number().int().positive().nullable().optional());

export const messageSchema = z.object({
  quoteCode: z.string().trim().min(1),
  lineId: optionalLineIdSchema,
  text: z.string().trim().min(2).max(2000),
});

const counterRequestSchema = z.object({
  lineId: z.coerce.number().int().positive(),
  proposedDiscountBps: z.coerce.number().int().min(0).max(10_000),
});

export const counterSchema = z.object({
  quoteCode: z.string().trim().min(1),
  requests: z.array(counterRequestSchema).min(1, "Select at least one product.").max(100),
  text: z.string().trim().max(2000).optional(),
}).superRefine((value, ctx) => {
  const lineIds = value.requests.map((request) => request.lineId);
  if (new Set(lineIds).size !== lineIds.length) {
    ctx.addIssue({ code: "custom", path: ["requests"], message: "Each product can only be selected once." });
  }
});

export const confirmSchema = z.object({ quoteCode: z.string().trim().min(1), revisionId: z.coerce.number().int().positive() });

export const confirmOnBehalfSchema = z.object({
  quoteCode: z.string().trim().min(1),
  revisionId: z.coerce.number().int().positive(),
  channel: z.enum(CONFIRM_CHANNELS),
  note: z.string().trim().min(8, "Write who agreed and how, in at least 8 characters.").max(500),
  authorized: z.string().optional(),
}).refine((value) => value.authorized === "yes", { message: "Confirm that the customer authorized this version.", path: ["authorized"] });

export const unauthorizedConfirmSchema = z.object({
  quoteCode: z.string().trim().min(1),
  note: z.string().trim().min(8, "Tell us what happened, in at least 8 characters.").max(500),
});
