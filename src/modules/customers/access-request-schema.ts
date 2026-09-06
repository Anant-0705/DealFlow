import { z } from "zod";

const emailSchema = z.email("Enter a valid primary contact email.").trim().max(254).transform((value) => value.toLowerCase());

export const customerAccessRequestSchema = z.object({
  companyName: z.string().trim().min(2, "Enter the company or customer name.").max(120),
  email: emailSchema,
  phone: z.string().trim().regex(/^[+0-9][0-9\s-]{7,19}$/, "Enter a valid phone number."),
  gstin: z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN."),
  billingAddress: z.string().trim().min(8, "Enter the complete billing address.").max(240),
});

export const reviewCustomerAccessRequestSchema = z.object({
  requestId: z.coerce.number().int().positive(),
  tier: z.enum(["BRONZE", "SILVER", "GOLD"]),
});

export type CustomerAccessRequestField = keyof z.input<typeof customerAccessRequestSchema>;

export type CustomerAccessRequestFormState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Partial<Record<CustomerAccessRequestField, string[]>>;
};

export const initialCustomerAccessRequestState: CustomerAccessRequestFormState = {
  status: "idle",
  message: "",
};
