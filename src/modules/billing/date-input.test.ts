import { describe, expect, it, vi, afterEach } from "vitest";
import { assertEffectiveToday, parseDateInput, utcDateKey } from "./date-input";

describe("parseDateInput", () => {
  it("parses a real calendar date at UTC midnight", () => {
    expect(parseDateInput("2028-02-29").toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });

  it.each(["", "2026-02-29", "2026-02-31", "2026-13-01", "not-a-date"])("rejects invalid date %j", (value) => {
    expect(() => parseDateInput(value)).toThrow("Choose a valid date.");
  });
});

describe("assertEffectiveToday", () => {
  afterEach(() => vi.useRealTimers());

  it("accepts today's UTC date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T18:00:00.000Z"));
    expect(() => assertEffectiveToday(parseDateInput("2026-09-06"))).not.toThrow();
  });

  it("rejects a future date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T18:00:00.000Z"));
    expect(() => assertEffectiveToday(parseDateInput("2026-10-01"))).toThrow(/today/);
  });

  it("formats UTC calendar keys without local timezone drift", () => {
    expect(utcDateKey(new Date("2026-09-06T23:30:00.000Z"))).toBe("2026-09-06");
  });
});
