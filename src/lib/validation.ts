import { z } from "zod";

export const positiveInt = z.coerce.number().int().positive();
export const nonNegativeInt = z.coerce.number().int().min(0);
export const bps = z.coerce.number().int().min(0).max(10_000);
export const paise = z.coerce.number().int().min(0);
export const dateOnly = z.iso.date();

export function formObject(formData: FormData | null | undefined) {
  if (!formData || typeof formData.entries !== "function") return {};
  const entries: Array<[string, string]> = [];
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") entries.push([key, value]);
  }
  return Object.fromEntries(entries);
}
