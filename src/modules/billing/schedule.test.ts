import { describe, expect, it } from "vitest";
import { periodCharge, projectUpcomingPeriods, upcomingScheduleFromPeriods } from "./schedule";

describe("periodCharge", () => {
  it("stores net and tax so the schedule matches the invoice", () => {
    expect(periodCharge(2, 300_000, 1800)).toEqual({ amountPaise: 600_000, taxPaise: 108_000, totalPaise: 708_000 });
  });
});

describe("projectUpcomingPeriods", () => {
  it("builds the next three billed periods from nextBillingAt", () => {
    const rows = projectUpcomingPeriods({
      nextBillingAt: new Date("2026-10-01T00:00:00Z"),
      unitPricePaise: 300_000,
      qty: 2,
      plan: { interval: "MONTHLY" },
    }, 1800, 3);
    expect(rows.map((row) => row.periodStart.toISOString().slice(0, 10))).toEqual(["2026-10-01", "2026-11-01", "2026-12-01"]);
    expect(rows[0]?.amountPaise).toBe(708_000);
    expect(rows[0]?.status).toBe("SCHEDULED");
  });
});

describe("upcomingScheduleFromPeriods", () => {
  it("hides invoiced rows and keeps skipped pause months visible", () => {
    const rows = upcomingScheduleFromPeriods([
      { periodStart: new Date("2026-09-01"), periodEnd: new Date("2026-09-30"), amountPaise: 300_000, taxPaise: 54_000, status: "INVOICED" },
      { periodStart: new Date("2026-10-01"), periodEnd: new Date("2026-10-31"), amountPaise: 300_000, taxPaise: 54_000, status: "SKIPPED" },
      { periodStart: new Date("2026-11-01"), periodEnd: new Date("2026-11-30"), amountPaise: 300_000, taxPaise: 54_000, status: "SCHEDULED" },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.status).toBe("SKIPPED");
    expect(rows[1]?.amountPaise).toBe(354_000);
  });
});
