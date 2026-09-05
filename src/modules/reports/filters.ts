import { z } from "zod";

export const reportFilterSchema = z.object({
  period: z.enum(["today", "week", "month", "custom"]).default("month"),
  mode: z.enum(["quotations", "orders"]).default("quotations"),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  repId: z.coerce.number().int().positive().optional(),
  approvalStatus: z.enum(["all", "auto", "pending", "approved", "rejected", "returned"]).default("all"),
  categoryId: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive().optional(),
});

export type ReportFilters = z.infer<typeof reportFilterSchema>;

type SearchValues = Record<string, string | string[] | undefined>;

export function parseReportFilters(values: SearchValues): ReportFilters {
  const single = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value || undefined]));
  const parsed = reportFilterSchema.safeParse(single);
  return parsed.success ? parsed.data : reportFilterSchema.parse({});
}

export function reportDateRange(filters: ReportFilters, now = new Date()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (filters.period === "week") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (filters.period === "month") start = new Date(start.getFullYear(), start.getMonth(), 1);
  if (filters.period === "custom" && filters.from) start = new Date(`${filters.from}T00:00:00`);
  if (filters.period === "custom" && filters.to) {
    const customEnd = new Date(`${filters.to}T23:59:59.999`);
    return { start, end: customEnd };
  }
  return { start, end };
}

export function filtersToSearchParams(filters: ReportFilters) {
  const params = new URLSearchParams({ period: filters.period, mode: filters.mode, approvalStatus: filters.approvalStatus });
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.repId) params.set("repId", String(filters.repId));
  if (filters.categoryId) params.set("categoryId", String(filters.categoryId));
  if (filters.productId) params.set("productId", String(filters.productId));
  return params;
}
