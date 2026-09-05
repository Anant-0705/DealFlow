import { describe, expect, it } from "vitest";
import { canPayInvoice } from "./payment-access";

describe("canPayInvoice", () => {
  it.each(["FINANCE", "ADMIN"])("allows %s to pay an invoice", (role) => {
    expect(canPayInvoice({ userId: 1, role, customerId: null }, 42)).toBe(true);
  });

  it("allows a customer to pay only their own invoice", () => {
    const actor = { userId: 2, role: "CUSTOMER", customerId: 42 };
    expect(canPayInvoice(actor, 42)).toBe(true);
    expect(canPayInvoice(actor, 7)).toBe(false);
  });

  it.each(["REP", "MANAGER"])("does not allow %s to start or settle checkout", (role) => {
    expect(canPayInvoice({ userId: 3, role, customerId: null }, 42)).toBe(false);
  });
});
