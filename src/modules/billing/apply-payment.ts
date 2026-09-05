import { logEvent } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";
import {
  creditedPaise,
  invoiceRemainingPaise,
  invoiceStatusFromBalances,
  quotePaymentStatusFromInvoices,
} from "./invoice-balance";

export async function refreshQuotePaymentStatus(tx: Prisma.TransactionClient, orderId: number) {
  const [order, invoices] = await Promise.all([
    tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { quoteId: true } }),
    tx.invoice.findMany({
      where: { orderId },
      select: { totalPaise: true, paidPaise: true, creditNotes: { select: { amountPaise: true } } },
    }),
  ]);
  await tx.quote.update({
    where: { id: order.quoteId },
    data: {
      paymentStatus: quotePaymentStatusFromInvoices(invoices.map((invoice) => ({
        totalPaise: invoice.totalPaise,
        paidPaise: invoice.paidPaise,
        creditedPaise: creditedPaise(invoice.creditNotes),
      }))),
      lastActivityAt: new Date(),
    },
  });
}

export async function applyInvoicePayment(
  tx: Prisma.TransactionClient,
  input: {
    invoiceCode: string;
    amountPaise: number;
    reference: string;
    method: string;
    receivedAt: Date;
    recordedById: number;
  },
) {
  const existing = await tx.payment.findUnique({ where: { reference: input.reference } });
  if (existing) return { duplicate: true as const, paymentId: existing.id };
  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { code: input.invoiceCode },
    include: { order: true, creditNotes: { select: { amountPaise: true } } },
  });
  const balance = invoiceRemainingPaise(invoice);
  if (input.amountPaise <= 0) throw new Error("Enter a positive amount.");
  if (input.amountPaise > balance) throw new Error(`Payment exceeds balance ₹${(balance / 100).toLocaleString("en-IN")}.`);
  const payment = await tx.payment.create({
    data: {
      invoiceId: invoice.id,
      amountPaise: input.amountPaise,
      reference: input.reference,
      method: input.method,
      receivedAt: input.receivedAt,
      recordedById: input.recordedById,
    },
  });
  const paidPaise = invoice.paidPaise + input.amountPaise;
  await tx.invoice.update({
    where: { id: invoice.id },
    data: { paidPaise, status: invoiceStatusFromBalances({ totalPaise: invoice.totalPaise, paidPaise }, creditedPaise(invoice.creditNotes)) },
  });
  await refreshQuotePaymentStatus(tx, invoice.orderId);
  await logEvent(tx, {
    entity: "PAYMENT",
    entityId: payment.id,
    quoteId: invoice.order.quoteId,
    action: "PAYMENT_RECORDED",
    actorId: input.recordedById,
    reason: `${input.reference} recorded against ${invoice.code}.`,
    meta: { amountPaise: input.amountPaise, method: input.method },
  });
  return { duplicate: false as const, paymentId: payment.id };
}
