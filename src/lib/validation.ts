import { z } from "zod";

export const positiveInt = z.coerce.number().int().positive();
export const nonNegativeInt = z.coerce.number().int().min(0);
export const bps = z.coerce.number().int().min(0).max(10_000);
export const paise = z.coerce.number().int().min(0);
export const dateOnly = z.iso.date();

export function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}
