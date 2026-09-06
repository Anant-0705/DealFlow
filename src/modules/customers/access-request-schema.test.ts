import { describe, expect, it } from "vitest";
import { customerAccessRequestSchema, reviewCustomerAccessRequestSchema } from "./access-request-schema";

const validRequest = {
  companyName: "Acme Corporation",
  email: "BUYER@ACME.COM",
  phone: "+91 80 2222 1001",
  billingAddress: "Acme Tower, MG Road, Bengaluru 560001",
};

describe("customer access requests", () => {
  it("normalizes a complete customer request", () => {
    const result = customerAccessRequestSchema.parse(validRequest);
    expect(result.email).toBe("buyer@acme.com");
    expect(result).not.toHaveProperty("gstin");
  });

  it("requires valid contact and billing details", () => {
    const result = customerAccessRequestSchema.safeParse({ ...validRequest, phone: "12", billingAddress: "short" });
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(result.error.flatten().fieldErrors)).toEqual(expect.arrayContaining(["phone", "billingAddress"]));
  });

  it("accepts only supported customer tiers during approval", () => {
    expect(reviewCustomerAccessRequestSchema.safeParse({ requestId: "4", tier: "GOLD" }).success).toBe(true);
    expect(reviewCustomerAccessRequestSchema.safeParse({ requestId: "4", tier: "PLATINUM" }).success).toBe(false);
  });
});
