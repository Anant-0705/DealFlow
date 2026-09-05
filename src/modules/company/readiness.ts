export type FieldGap = { field: string; label: string };

export type CompanyFields = {
  legalName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNo: string;
  bankIfsc: string;
};

export type CustomerFields = {
  name: string;
  email: string;
  phone: string;
  gstin: string;
  billingAddress: string;
};

export type DocumentGaps = {
  company: FieldGap[];
  customer: FieldGap[];
};

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PINCODE = /^[1-9][0-9]{5}$/;
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PHONE = /^[+0-9][0-9\s-]{7,19}$/;

function text(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function filled(value: string | null | undefined) {
  return Boolean(text(value));
}

function gap(field: string, label: string, ok: boolean): FieldGap | null {
  return ok ? null : { field, label };
}

export function companyIdentityGaps(company: CompanyFields | null | undefined): FieldGap[] {
  const row = company ?? emptyCompany();
  return [
    gap("legalName", "legal name", filled(row.legalName)),
    gap("addressLine1", "address", filled(row.addressLine1)),
    gap("city", "city", filled(row.city)),
    gap("state", "state", filled(row.state)),
    gap("pincode", "PIN code", PINCODE.test(text(row.pincode))),
    gap("email", "company email", filled(row.email)),
    gap("phone", "company phone", PHONE.test(text(row.phone))),
    gap("gstin", "company GSTIN", GSTIN.test(text(row.gstin).toUpperCase())),
    gap("bankName", "bank name", filled(row.bankName)),
    gap("bankAccountName", "account name", filled(row.bankAccountName)),
    gap("bankAccountNo", "account number", filled(row.bankAccountNo)),
    gap("bankIfsc", "IFSC", IFSC.test(text(row.bankIfsc).toUpperCase())),
  ].filter((item): item is FieldGap => item !== null);
}

export function customerBillingGaps(customer: CustomerFields | null | undefined): FieldGap[] {
  const row = customer ?? emptyCustomer();
  return [
    gap("name", "customer name", filled(row.name)),
    gap("email", "customer email", filled(row.email)),
    gap("phone", "customer phone", PHONE.test(text(row.phone))),
    gap("billingAddress", "billing address", filled(row.billingAddress)),
    gap("gstin", "customer GSTIN", GSTIN.test(text(row.gstin).toUpperCase())),
  ].filter((item): item is FieldGap => item !== null);
}

export function documentGaps(company: CompanyFields | null | undefined, customer: CustomerFields | null | undefined): DocumentGaps {
  return { company: companyIdentityGaps(company), customer: customerBillingGaps(customer) };
}

export function documentsReady(gaps: DocumentGaps) {
  return gaps.company.length === 0 && gaps.customer.length === 0;
}

export function documentErrorMessage(gaps: DocumentGaps, customerName?: string) {
  const parts: string[] = [];
  if (gaps.company.length) {
    parts.push(`Company details are incomplete (${gaps.company.map((item) => item.label).join(", ")}). Open Settings → Company and save every required field before sending, confirming, or printing.`);
  }
  if (gaps.customer.length) {
    const who = customerName?.trim() || "this customer";
    parts.push(`Billing details for ${who} are incomplete (${gaps.customer.map((item) => item.label).join(", ")}). Add them in Settings → Customers, or ask the customer to complete Portal → Profile.`);
  }
  return parts.join(" ");
}

export function emptyCompany(): CompanyFields & {
  tradingName: string;
  tagline: string;
  addressLine2: string;
  country: string;
  pan: string;
  logoDataUrl: string | null;
} {
  return {
    legalName: "",
    tradingName: "DealFlow",
    tagline: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    gstin: "",
    pan: "",
    bankName: "",
    bankAccountName: "",
    bankAccountNo: "",
    bankIfsc: "",
    logoDataUrl: null,
  };
}

export function emptyCustomer(): CustomerFields {
  return { name: "", email: "", phone: "", gstin: "", billingAddress: "" };
}

export const GSTIN_PATTERN = GSTIN;
export const PINCODE_PATTERN = PINCODE;
export const IFSC_PATTERN = IFSC;
export const PHONE_PATTERN = PHONE;
