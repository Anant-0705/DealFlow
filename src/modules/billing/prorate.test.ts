import { describe, expect, it } from "vitest";
import { prorate } from "./prorate";

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
  it("handles a quarterly period", () => expect(run({ effectiveDate: "2026-02-01", periodStart: "2026-01-01", periodEnd: "2026-03-31" }).daysInPeriod).toBe(90));
  it("returns a credit for a negative delta", () => expect(run({ qtyDelta: -2 }).amountPaise).toBe(-300_000));
  it("defers plans that do not prorate", () => expect(run({ prorateChanges: false }).amountPaise).toBe(0));
  it("rounds half paise away from zero", () => expect(run({ unitAmountPaise: 1, effectiveDate: "2026-09-16" }).amountPaise).toBe(1));
});
