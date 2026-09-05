import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/modules/customers/links";
import {
  cashfreeConfig,
  cashfreePhone,
  createCashfreeOrder,
  fetchCashfreeOrder,
  fetchCashfreePayments,
  isCashfreeConfigured,
  paymentMethodLabel,
} from "@/lib/cashfree";
import { applyInvoicePayment } from "./apply-payment";
import { canPayInvoice, type PaymentActor } from "./payment-access";

export async function cashfreeGatewayStatus() {
  return { configured: isCashfreeConfigured(), mode: cashfreeConfig().env };
}

export async function startCashfreeCheckout(invoiceCode: string, actor: PaymentActor) {
  if (!isCashfreeConfigured()) throw new Error("Cashfree is not configured on this server.");
  const invoice = await prisma.invoice.findUnique({
    where: { code: invoiceCode },
    include: { order: { include: { quote: { include: { customer: true } } } } },
  });
  if (!invoice) throw new Error("Invoice not found.");
  if (!canPayInvoice(actor, invoice.order.quote.customerId)) {
    throw new Error("You do not have permission to pay this invoice.");
  }
  const balance = invoice.totalPaise - invoice.paidPaise;
  if (balance <= 0) throw new Error("This invoice is already paid.");
  // Keep the document query out of the settlement dependency graph so the
  // reconciliation smoke script can run outside the Next.js runtime.
  const { getDocumentParties } = await import("@/modules/company/queries");
  const documents = await getDocumentParties(invoice.order.quote.customerId);
  if (!documents.ready) throw new Error(documents.message);
  const customer = invoice.order.quote.customer;
  cashfreePhone(customer.phone);
  const orderId = `df${invoice.code.replace(/[^A-Za-z0-9]/g, "")}${Date.now()}`.slice(0, 45);
  const returnUrl = `${appBaseUrl()}/pay/cashfree/return?order_id={order_id}`;
  const notifyUrl = `${appBaseUrl()}/api/webhooks/cashfree`;
  const created = await createCashfreeOrder({
    orderId,
    amountPaise: balance,
    customerId: `cust${customer.id}`,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    returnUrl,
    notifyUrl,
    note: `DealFlow invoice ${invoice.code}`,
  });
  await prisma.paymentSession.create({
    data: {
      invoiceId: invoice.id,
      orderId: created.order_id,
      cfOrderId: created.cf_order_id ? String(created.cf_order_id) : null,
      paymentSessionId: created.payment_session_id,
      amountPaise: balance,
      status: "CREATED",
      createdById: actor.userId,
    },
  });
  return {
    orderId: created.order_id,
    paymentSessionId: created.payment_session_id,
    mode: cashfreeConfig().env,
    invoiceCode: invoice.code,
  };
}

export async function settleCashfreeOrder(orderId: string) {
  const session = await prisma.paymentSession.findUnique({
    where: { orderId },
    include: { invoice: { include: { order: { include: { quote: true } } } } },
  });
  if (!session) return { ok: false as const, message: "Unknown Cashfree order." };
  if (session.status === "PAID") {
    return { ok: true as const, duplicate: true, invoiceCode: session.invoice.code, customerId: session.invoice.order.quote.customerId };
  }
  const order = await fetchCashfreeOrder(orderId);
  if (order.order_status !== "PAID") {
    await prisma.paymentSession.update({
      where: { id: session.id },
      data: { status: order.order_status === "EXPIRED" ? "EXPIRED" : order.order_status === "TERMINATED" ? "FAILED" : session.status },
    });
    return { ok: false as const, message: `Payment is ${order.order_status.toLowerCase()}. Complete checkout and we will confirm the invoice.`, invoiceCode: session.invoice.code };
  }
  const orderAmountPaise = Math.round(order.order_amount * 100);
  if (order.order_currency !== "INR" || orderAmountPaise !== session.amountPaise) {
    throw new Error("Cashfree order amount or currency does not match this payment session.");
  }
  const payments = await fetchCashfreePayments(orderId);
  const success = payments.find((row) => String(row.payment_status).toUpperCase() === "SUCCESS");
  if (!success?.cf_payment_id || success.payment_amount == null) {
    throw new Error("Cashfree marked the order paid, but the successful payment details are not available yet.");
  }
  const cfPaymentId = String(success.cf_payment_id);
  const amountPaise = Math.round(success.payment_amount * 100);
  if (amountPaise !== session.amountPaise) {
    throw new Error("Cashfree payment amount does not match this payment session.");
  }
  const outcome = await prisma.$transaction(async (tx) => {
    const result = await applyInvoicePayment(tx, {
      invoiceCode: session.invoice.code,
      amountPaise,
      reference: `CF-${cfPaymentId}`,
      method: paymentMethodLabel(success ?? {}),
      receivedAt: new Date(),
      recordedById: session.createdById,
    });
    await tx.paymentSession.update({ where: { id: session.id }, data: { status: "PAID" } });
    return result;
  }, { isolationLevel: "Serializable" });
  return {
    ok: true as const,
    duplicate: outcome.duplicate,
    invoiceCode: session.invoice.code,
    customerId: session.invoice.order.quote.customerId,
  };
}

export async function settleCashfreeOrderForActor(orderId: string, actor: PaymentActor) {
  const paymentSession = await prisma.paymentSession.findUnique({
    where: { orderId },
    select: { invoice: { select: { order: { select: { quote: { select: { customerId: true } } } } } } },
  });
  if (!paymentSession) return { ok: false as const, message: "Unknown Cashfree order." };
  if (!canPayInvoice(actor, paymentSession.invoice.order.quote.customerId)) {
    throw new Error("You do not have permission to settle this invoice payment.");
  }
  return settleCashfreeOrder(orderId);
}
