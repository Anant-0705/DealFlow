import { describe, expect, it } from "vitest";
import { dueBillingPeriods, prorate } from "./prorate";

const run = (overrides: Partial<Parameters<typeof prorate>[0]> = {}) => prorate({
  unitAmountPaise: 300_000,
  qtyDelta: 1,
  effectiveDate: "2026-09-16",
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  prorateChanges: true,
  ...overrides,
});

describe("prorate", () => {
  it("charges 15/30 for a mid-month seat", () => expect(run().amountPaise).toBe(150_000));
  it("charges a full month on the first", () => expect(run({ effectiveDate: "2026-09-01" }).amountPaise).toBe(300_000));
  it("charges one day on the last day", () => expect(run({ effectiveDate: "2026-09-30" }).amountPaise).toBe(10_000));
  it("handles February", () => expect(run({ effectiveDate: "2028-02-15", periodStart: "2028-02-01", periodEnd: "2028-02-29" }).daysInPeriod).toBe(29));
  it("uses a 28-day denominator in a non-leap February", () => expect(run({ effectiveDate: "2026-02-15", periodStart: "2026-02-01", periodEnd: "2026-02-28" }).daysInPeriod).toBe(28));
  it("handles a quarterly period", () => expect(run({ effectiveDate: "2026-02-01", periodStart: "2026-01-01", periodEnd: "2026-03-31" }).daysInPeriod).toBe(90));
  it("returns a credit for a negative delta", () => expect(run({ qtyDelta: -2 }).amountPaise).toBe(-300_000));
  it("defers plans that do not prorate", () => expect(run({ prorateChanges: false }).amountPaise).toBe(0));
  it("rounds half paise away from zero", () => expect(run({ unitAmountPaise: 1, effectiveDate: "2026-09-16" }).amountPaise).toBe(1));
});

describe("dueBillingPeriods", () => {
  it("catches up every missed month in one pass", () => {
    const periods = dueBillingPeriods("2026-06-01", "2026-09-01", "MONTHLY");
    expect(periods.map((period) => period.periodStart.toISOString().slice(0, 10))).toEqual([
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
    ]);
    expect(periods.at(-1)?.nextBillingAt.toISOString().slice(0, 10)).toBe("2026-10-01");
  });

  it("returns nothing when billing is already ahead", () => {
    expect(dueBillingPeriods("2026-10-01", "2026-09-01", "MONTHLY")).toEqual([]);
  });

  it("caps catch-up so one run cannot create unbounded invoices", () => {
    expect(dueBillingPeriods("2020-01-01", "2026-09-01", "MONTHLY", 3)).toHaveLength(3);
  });
});
