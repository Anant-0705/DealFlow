import { logEvent } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";

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
  const invoice = await tx.invoice.findUniqueOrThrow({ where: { code: input.invoiceCode }, include: { order: true } });
  const balance = invoice.totalPaise - invoice.paidPaise;
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
  await tx.invoice.update({ where: { id: invoice.id }, data: { paidPaise, status: paidPaise === invoice.totalPaise ? "PAID" : "PARTIAL" } });
  const invoices = await tx.invoice.findMany({ where: { orderId: invoice.orderId }, select: { id: true, totalPaise: true, paidPaise: true } });
  const allPaid = invoices.every((row) => row.id === invoice.id ? paidPaise >= row.totalPaise : row.paidPaise >= row.totalPaise);
  const anyPaid = invoices.some((row) => row.id === invoice.id ? paidPaise > 0 : row.paidPaise > 0);
  await tx.quote.update({
    where: { id: invoice.order.quoteId },
    data: { paymentStatus: allPaid ? "PAID" : anyPaid ? "PARTIAL" : "UNPAID", lastActivityAt: new Date() },
  });
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
