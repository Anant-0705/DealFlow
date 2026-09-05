import { describe, expect, it } from "vitest";
import {
  grossPaise,
  invoiceRemainingPaise,
  invoiceStatusFromBalances,
  quotePaymentStatusFromInvoices,
  taxOnNet,
} from "./invoice-balance";

describe("invoiceRemainingPaise", () => {
  it("keeps the original billed total and subtracts credits", () => {
    expect(invoiceRemainingPaise({
      totalPaise: 100_000,
      paidPaise: 20_000,
      creditNotes: [{ amountPaise: 30_000 }],
    })).toBe(50_000);
  });

  it("never goes negative", () => {
    expect(invoiceRemainingPaise({ totalPaise: 10_000, paidPaise: 10_000, creditNotes: [{ amountPaise: 5_000 }] })).toBe(0);
  });
});

describe("invoiceStatusFromBalances", () => {
  it("stays unpaid until money or credit is applied", () => {
    expect(invoiceStatusFromBalances({ totalPaise: 10_000, paidPaise: 0 }, 0)).toBe("UNPAID");
  });

  it("marks a partial credit on an unpaid invoice", () => {
    expect(invoiceStatusFromBalances({ totalPaise: 10_000, paidPaise: 0 }, 4_000)).toBe("PARTIAL");
  });

  it("marks a fully credited unpaid invoice as credited", () => {
    expect(invoiceStatusFromBalances({ totalPaise: 10_000, paidPaise: 0 }, 10_000)).toBe("CREDITED");
  });

  it("marks a fully paid invoice as paid even with a later credit record", () => {
    expect(invoiceStatusFromBalances({ totalPaise: 10_000, paidPaise: 10_000 }, 2_000)).toBe("PAID");
  });
});

describe("grossPaise", () => {
  it("adds tax so a credit can clear an unpaid taxed invoice", () => {
    expect(taxOnNet(150_000, 1800)).toBe(27_000);
    expect(grossPaise(150_000, 1800)).toBe(177_000);
    expect(grossPaise(-150_000, 1800)).toBe(-177_000);
    expect(invoiceRemainingPaise({
      totalPaise: 177_000,
      paidPaise: 0,
      creditNotes: [{ amountPaise: Math.abs(grossPaise(-150_000, 1800)) }],
    })).toBe(0);
  });
});

describe("quotePaymentStatusFromInvoices", () => {
  it("keeps a previously paid quote partial after a new unpaid invoice", () => {
    expect(quotePaymentStatusFromInvoices([
      { totalPaise: 10_000, paidPaise: 10_000, creditedPaise: 0 },
      { totalPaise: 8_000, paidPaise: 0, creditedPaise: 0 },
    ])).toBe("PARTIAL");
  });

  it("marks the quote paid when remaining balances are cleared by payment or credit", () => {
    expect(quotePaymentStatusFromInvoices([
      { totalPaise: 10_000, paidPaise: 7_000, creditedPaise: 3_000 },
    ])).toBe("PAID");
  });
});
