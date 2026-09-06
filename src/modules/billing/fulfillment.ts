import type { Prisma } from "../../generated/prisma/client";
import { logEvent } from "../../lib/audit";
import { nextInvoiceCode } from "../../lib/codes";
import { refreshQuotePaymentStatus } from "./apply-payment";
import { shipmentCharge } from "./fulfillment-charge";

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

export async function issueFulfillmentInvoice(
  db: Prisma.TransactionClient,
  input: {
    allocationId: number;
    orderId: number;
    orderLineId: number;
    quoteId: number;
    actorId: number;
    orderedQty: number;
    shipmentQty: number;
    description: string;
    quotedNetPaise: number;
    quotedTaxPaise: number;
    issuedAt: Date;
  },
) {
  const existing = await db.invoiceLine.findFirst({
    where: { allocationId: input.allocationId },
    include: { invoice: true },
  });
  if (existing) return { invoice: existing.invoice, qty: existing.qty, alreadyInvoiced: true as const };

  const priorLines = await db.invoiceLine.findMany({
    where: {
      orderLineId: input.orderLineId,
      invoice: { kind: { in: ["ONE_TIME", "FULFILLMENT"] } },
    },
    select: { qty: true, taxPaise: true, totalPaise: true },
  });
  const previouslyInvoicedQty = priorLines.reduce((sum, line) => sum + line.qty, 0);
  if (previouslyInvoicedQty >= input.orderedQty) return null;

  const previouslyInvoicedTaxPaise = priorLines.reduce((sum, line) => sum + line.taxPaise, 0);
  const previouslyInvoicedNetPaise = priorLines.reduce((sum, line) => sum + line.totalPaise - line.taxPaise, 0);
  const charge = shipmentCharge({
    orderedQty: input.orderedQty,
    shipmentQty: input.shipmentQty,
    previouslyInvoicedQty,
    quotedNetPaise: input.quotedNetPaise,
    quotedTaxPaise: input.quotedTaxPaise,
    previouslyInvoicedNetPaise,
    previouslyInvoicedTaxPaise,
  });
  const code = await nextInvoiceCode(db);
  const invoice = await db.invoice.create({
    data: {
      code,
      orderId: input.orderId,
      kind: "FULFILLMENT",
      totalPaise: charge.totalPaise,
      issuedAt: input.issuedAt,
      dueAt: addDays(input.issuedAt, 15),
      lines: {
        create: {
          orderLineId: input.orderLineId,
          allocationId: input.allocationId,
          description: input.description,
          qty: charge.qty,
          unitPaise: charge.unitPaise,
          taxPaise: charge.taxPaise,
          totalPaise: charge.totalPaise,
        },
      },
    },
  });
  await refreshQuotePaymentStatus(db, input.orderId);
  await logEvent(db, {
    entity: "INVOICE",
    entityId: invoice.id,
    quoteId: input.quoteId,
    action: "INVOICE_ISSUED",
    actorId: input.actorId,
    reason: `${code} issued for ${input.shipmentQty} shipped unit${input.shipmentQty === 1 ? "" : "s"}.`,
    meta: { allocationId: input.allocationId, orderLineId: input.orderLineId, qty: input.shipmentQty },
  });
  return { invoice, qty: charge.qty, alreadyInvoiced: false as const };
}
