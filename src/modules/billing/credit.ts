import type { Prisma } from "@/generated/prisma/client";
import { nextCreditNoteCode } from "@/lib/codes";
import { creditedPaise, invoiceRemainingPaise, invoiceStatusFromBalances } from "./invoice-balance";
import { refreshQuotePaymentStatus } from "./apply-payment";

export async function applyInvoiceCredit(
  tx: Prisma.TransactionClient,
  invoiceId: number,
  amountPaise: number,
  reason: string,
) {
  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { creditNotes: { select: { amountPaise: true } } },
  });
  const remaining = invoiceRemainingPaise(invoice);
  const creditAmount = remaining > 0 ? Math.min(amountPaise, remaining) : amountPaise;
  const code = await nextCreditNoteCode(tx);
  const credit = await tx.creditNote.create({ data: { code, invoiceId, amountPaise: creditAmount, reason } });
  const credited = creditedPaise(invoice.creditNotes) + creditAmount;
  await tx.invoice.update({
    where: { id: invoice.id },
    data: { status: invoiceStatusFromBalances(invoice, credited) },
  });
  await refreshQuotePaymentStatus(tx, invoice.orderId);
  return credit;
}

export async function applySubscriptionCredit(
  tx: Prisma.TransactionClient,
  input: { orderId: number; orderLineId: number; amountPaise: number; reason: string },
) {
  const invoice = await tx.invoice.findFirst({
    where: { orderId: input.orderId, kind: "RECURRING", lines: { some: { orderLineId: input.orderLineId } } },
    include: { creditNotes: { select: { amountPaise: true } } },
    orderBy: { issuedAt: "desc" },
  }) ?? await tx.invoice.findFirst({
    where: { orderId: input.orderId },
    include: { creditNotes: { select: { amountPaise: true } } },
    orderBy: { issuedAt: "desc" },
  });
  if (!invoice) throw new Error("No invoice exists to apply this credit.");
  return applyInvoiceCredit(tx, invoice.id, input.amountPaise, input.reason);
}
