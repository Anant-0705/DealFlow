import { z } from "zod";
import { GSTIN_PATTERN, IFSC_PATTERN, PHONE_PATTERN, PINCODE_PATTERN } from "./readiness";

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value ?? "");

export const companySchema = z.object({
  legalName: z.string().trim().min(2, "Enter the legal company name.").max(160),
  tradingName: z.string().trim().min(2, "Enter the trading name.").max(80),
  tagline: optionalText(120),
  email: z.email().trim().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().regex(PHONE_PATTERN, "Enter a valid company phone number."),
  addressLine1: z.string().trim().min(3, "Enter the street address.").max(160),
  addressLine2: optionalText(160),
  city: z.string().trim().min(2, "Enter the city.").max(80),
  state: z.string().trim().min(2, "Enter the state.").max(80),
  pincode: z.string().trim().regex(PINCODE_PATTERN, "Enter a 6-digit PIN code."),
  country: z.string().trim().min(2).max(80).default("India"),
  gstin: z.string().trim().toUpperCase().regex(GSTIN_PATTERN, "Enter a 15-character GSTIN."),
  pan: optionalText(10).transform((value) => value.toUpperCase()),
  bankName: z.string().trim().min(2, "Enter the bank name.").max(80),
  bankAccountName: z.string().trim().min(2, "Enter the account name.").max(120),
  bankAccountNo: z.string().trim().min(6, "Enter the account number.").max(24).regex(/^[0-9]+$/, "Account number must be digits only."),
  bankIfsc: z.string().trim().toUpperCase().regex(IFSC_PATTERN, "Enter a valid IFSC code."),
});

export const customerBillingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().trim().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().regex(PHONE_PATTERN, "Enter a valid customer phone number."),
  gstin: z.string().trim().toUpperCase().regex(GSTIN_PATTERN, "Enter a 15-character customer GSTIN."),
  billingAddress: z.string().trim().min(8, "Enter the billing address.").max(240),
});

export type CompanyInput = z.infer<typeof companySchema>;
export type CustomerBillingInput = z.infer<typeof customerBillingSchema>;
