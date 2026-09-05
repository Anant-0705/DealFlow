import { describe, expect, it } from "vitest";
import { companyIdentityGaps, customerBillingGaps, documentErrorMessage, documentGaps, documentsReady, emptyCompany } from "./readiness";

const company = {
  legalName: "DealFlow Technologies Pvt. Ltd.",
  email: "billing@dealflow.demo",
  phone: "+91 80 4000 1200",
  addressLine1: "14 Residency Road",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560025",
  gstin: "29AABCU9603R1ZM",
  bankName: "HDFC Bank",
  bankAccountName: "DealFlow Technologies Pvt. Ltd.",
  bankAccountNo: "50100123456789",
  bankIfsc: "HDFC0001234",
};

const customer = {
  name: "Acme Corp",
  email: "buyer@acme.demo",
  phone: "+91 80 2222 1001",
  gstin: "29AABCA1234A1Z5",
  billingAddress: "Acme Tower, MG Road, Bengaluru 560001",
};

describe("document readiness", () => {
  it("treats a complete company and customer as ready", () => {
    const gaps = documentGaps(company, customer);
    expect(gaps).toEqual({ company: [], customer: [] });
    expect(documentsReady(gaps)).toBe(true);
  });

  it("lists every missing company identity and bank field", () => {
    const gaps = companyIdentityGaps(emptyCompany());
    expect(gaps.map((item) => item.field)).toEqual([
      "legalName", "addressLine1", "city", "state", "pincode", "email", "phone", "gstin",
      "bankName", "bankAccountName", "bankAccountNo", "bankIfsc",
    ]);
  });

  it("rejects an invalid GSTIN and PIN code", () => {
    const gaps = companyIdentityGaps({ ...company, gstin: "29GST", pincode: "5600" });
    expect(gaps.map((item) => item.field)).toEqual(["pincode", "gstin"]);
  });

  it("lists missing customer billing fields", () => {
    const gaps = customerBillingGaps({ name: "Acme Corp", email: "buyer@acme.demo", phone: "", gstin: "", billingAddress: "" });
    expect(gaps.map((item) => item.field)).toEqual(["phone", "billingAddress", "gstin"]);
  });

  it("explains both sides in the blocking message", () => {
    const message = documentErrorMessage(documentGaps(emptyCompany(), { ...customer, phone: "" }), "Acme Corp");
    expect(message).toContain("Company details are incomplete");
    expect(message).toContain("Settings → Company");
    expect(message).toContain("Billing details for Acme Corp");
    expect(message).toContain("Portal → Profile");
  });
});
