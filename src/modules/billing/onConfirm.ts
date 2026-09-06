import type { Prisma } from "@/generated/prisma/client";
import { nextInvoiceCode } from "@/lib/codes";
import { logEvent } from "@/lib/audit";
import { calendarPeriod, prorate } from "./prorate";
import { taxOnNet } from "./invoice-balance";
import { ensureUpcomingPeriods, recordInvoicedPeriod } from "./periods";
import { lineRequiresStock } from "@/modules/inventory/fulfillment-status";

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

export async function generateInitialBilling(
  db: Prisma.TransactionClient,
  input: { orderId: number; quoteId: number; actorId: number; confirmedAt: Date },
) {
  const order = await db.order.findUniqueOrThrow({
    where: { id: input.orderId },
    include: { lines: { include: { product: { include: { plan: true, category: true } }, quoteLine: true } } },
  });
  const oneTimeAtConfirmation = order.lines.filter((line) =>
    !line.product.isSubscription && !lineRequiresStock(line.product),
  );
  const recurring = order.lines.filter((line) => line.product.isSubscription && line.product.planId);
  const invoiceIds: number[] = [];
  const subscriptionIds: number[] = [];

  if (oneTimeAtConfirmation.length) {
    const code = await nextInvoiceCode(db);
    const invoice = await db.invoice.create({
      data: {
        code,
        orderId: order.id,
        kind: "ONE_TIME",
        totalPaise: oneTimeAtConfirmation.reduce((sum, line) => sum + line.quoteLine.netPaise + line.quoteLine.taxPaise, 0),
        issuedAt: input.confirmedAt,
        dueAt: addDays(input.confirmedAt, 15),
        lines: { create: oneTimeAtConfirmation.map((line) => ({
          orderLineId: line.id,
          description: line.quoteLine.description,
          qty: line.qty,
          unitPaise: Math.round(line.quoteLine.netPaise / line.qty),
          taxPaise: line.quoteLine.taxPaise,
          totalPaise: line.quoteLine.netPaise + line.quoteLine.taxPaise,
        })) },
      },
    });
    invoiceIds.push(invoice.id);
    await logEvent(db, { entity: "INVOICE", entityId: invoice.id, quoteId: input.quoteId, action: "INVOICE_ISSUED", actorId: input.actorId, reason: `${code} issued for non-stock one-time lines.` });
  }

  for (const line of recurring) {
    const plan = line.product.plan!;
    const period = calendarPeriod(input.confirmedAt, plan.interval);
    const unitPricePaise = Math.round(line.quoteLine.netPaise / line.qty);
    const subscription = await db.subscription.create({ data: {
      orderId: order.id,
      orderLineId: line.id,
      planId: plan.id,
      qty: line.qty,
      unitPricePaise,
      startsAt: input.confirmedAt,
      nextBillingAt: period.nextBillingAt,
    } });
    subscriptionIds.push(subscription.id);
    await logEvent(db, { entity: "SUBSCRIPTION", entityId: subscription.id, quoteId: input.quoteId, action: "SUBSCRIPTION_CREATED", actorId: input.actorId, reason: `${line.product.name} subscription created.` });

    const first = prorate({ unitAmountPaise: unitPricePaise, qtyDelta: line.qty, effectiveDate: input.confirmedAt, periodStart: period.periodStart, periodEnd: period.periodEnd, prorateChanges: true });
    const taxPaise = taxOnNet(first.amountPaise, line.product.taxBps);
    const code = await nextInvoiceCode(db);
    const invoice = await db.invoice.create({ data: {
      code,
      orderId: order.id,
      kind: "RECURRING",
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      totalPaise: first.amountPaise + taxPaise,
      issuedAt: input.confirmedAt,
      dueAt: addDays(input.confirmedAt, 15),
      lines: { create: { orderLineId: line.id, description: `${line.product.name} · ${first.reason}`, qty: line.qty, unitPaise: unitPricePaise, taxPaise, totalPaise: first.amountPaise + taxPaise } },
    } });
    invoiceIds.push(invoice.id);
    await recordInvoicedPeriod(db, { subscription: { ...subscription, plan }, periodStart: period.periodStart, periodEnd: period.periodEnd, invoiceId: invoice.id, taxBps: line.product.taxBps });
    await ensureUpcomingPeriods(db, { ...subscription, plan }, line.product.taxBps);
    await logEvent(db, { entity: "INVOICE", entityId: invoice.id, quoteId: input.quoteId, action: "INVOICE_ISSUED", actorId: input.actorId, reason: `${code} issued for the first recurring period.`, meta: { proration: first } });
  }
  return { invoiceIds, subscriptionIds };
}
