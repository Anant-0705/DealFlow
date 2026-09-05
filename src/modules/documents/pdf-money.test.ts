import { describe, expect, it } from "vitest";
import { formatPdfMoney } from "./pdf";

describe("formatPdfMoney", () => {
  it("formats paise as Indian rupees without the rupee glyph", () => {
    expect(formatPdfMoney(12_34_500)).toBe("Rs 12,345.00");
  });
});
