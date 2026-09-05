import { createHmac, timingSafeEqual } from "node:crypto";

export type CashfreeOrder = {
  order_id: string;
  cf_order_id?: string | number;
  order_amount: number;
  order_currency: string;
  order_status: string;
  payment_session_id: string;
};

export type CashfreePayment = {
  cf_payment_id?: string | number;
  payment_amount?: number;
  payment_status?: string;
  payment_method?: string | { card?: unknown; upi?: unknown; netbanking?: unknown };
};

export function cashfreeConfig() {
  const appId = process.env.CASHFREE_APP_ID?.trim() ?? "";
  const secretKey = process.env.CASHFREE_SECRET_KEY?.trim() ?? "";
  const apiUrl = (process.env.CASHFREE_API_URL?.trim() || "https://sandbox.cashfree.com/pg").replace(/\/$/, "");
  const apiVersion = process.env.CASHFREE_API_VERSION?.trim() || "2025-01-01";
  const env = (process.env.CASHFREE_ENV?.trim() || (apiUrl.includes("sandbox") ? "sandbox" : "production")) as "sandbox" | "production";
  return { appId, secretKey, apiUrl, apiVersion, env, configured: Boolean(appId && secretKey) };
}

export function isCashfreeConfigured() {
  return cashfreeConfig().configured;
}

export function cashfreePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("91")) return digits.slice(-10);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length === 10) return digits;
  throw new Error("Cashfree needs a 10-digit Indian mobile number on the customer record.");
}

export function verifyCashfreeWebhook(rawBody: string, signature: string | null, timestamp: string | null) {
  const { secretKey } = cashfreeConfig();
  if (!signature || !timestamp || !secretKey) return false;
  const expected = createHmac("sha256", secretKey).update(timestamp + rawBody).digest("base64");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function cashfreeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { appId, secretKey, apiUrl, apiVersion, configured } = cashfreeConfig();
  if (!configured) throw new Error("Cashfree is not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY.");
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": apiVersion,
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body === "object" && body && "message" in body ? String((body as { message: string }).message) : `Cashfree request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

export function createCashfreeOrder(input: {
  orderId: string;
  amountPaise: number;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  notifyUrl: string;
  note: string;
}) {
  return cashfreeFetch<CashfreeOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: Math.round(input.amountPaise) / 100,
      order_currency: "INR",
      customer_details: {
        customer_id: input.customerId,
        customer_name: input.customerName,
        customer_email: input.customerEmail,
        customer_phone: cashfreePhone(input.customerPhone),
      },
      order_meta: { return_url: input.returnUrl, notify_url: input.notifyUrl },
      order_note: input.note,
    }),
  });
}

export function fetchCashfreeOrder(orderId: string) {
  return cashfreeFetch<CashfreeOrder>(`/orders/${encodeURIComponent(orderId)}`);
}

export function fetchCashfreePayments(orderId: string) {
  return cashfreeFetch<CashfreePayment[]>(`/orders/${encodeURIComponent(orderId)}/payments`);
}

export function paymentMethodLabel(payment: CashfreePayment) {
  if (typeof payment.payment_method === "string" && payment.payment_method.trim()) return `Cashfree ${payment.payment_method}`;
  if (payment.payment_method && typeof payment.payment_method === "object") {
    if ("upi" in payment.payment_method) return "Cashfree UPI";
    if ("card" in payment.payment_method) return "Cashfree card";
    if ("netbanking" in payment.payment_method) return "Cashfree net banking";
  }
  return "Cashfree";
}
