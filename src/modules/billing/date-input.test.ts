import { describe, expect, it } from "vitest";
import { parseDateInput } from "./date-input";

describe("parseDateInput", () => {
  it("parses a real calendar date at UTC midnight", () => {
    expect(parseDateInput("2028-02-29").toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });

  it.each(["", "2026-02-29", "2026-02-31", "2026-13-01", "not-a-date"])("rejects invalid date %j", (value) => {
    expect(() => parseDateInput(value)).toThrow("Choose a valid date.");
  });
});
