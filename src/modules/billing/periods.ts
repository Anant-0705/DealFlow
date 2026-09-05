import type { Prisma } from "@/generated/prisma/client";
import { calendarPeriod } from "./prorate";
import { periodCharge } from "./schedule";

const DAY_MS = 86_400_000;

type PeriodSubscription = {
  id: number;
  qty: number;
  unitPricePaise: number;
  nextBillingAt: Date;
  plan: { interval: "MONTHLY" | "QUARTERLY" | "YEARLY" };
};

export async function recordInvoicedPeriod(
  db: Prisma.TransactionClient,
  input: {
    subscription: PeriodSubscription;
    periodStart: Date;
    periodEnd: Date;
    invoiceId: number;
    taxBps: number;
  },
) {
  const charge = periodCharge(input.subscription.qty, input.subscription.unitPricePaise, input.taxBps);
  await db.billingPeriod.upsert({
    where: { subscriptionId_periodStart: { subscriptionId: input.subscription.id, periodStart: input.periodStart } },
    update: { status: "INVOICED", invoiceId: input.invoiceId, qty: input.subscription.qty, unitPricePaise: input.subscription.unitPricePaise, amountPaise: charge.amountPaise, taxPaise: charge.taxPaise },
    create: {
      subscriptionId: input.subscription.id,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      qty: input.subscription.qty,
      unitPricePaise: input.subscription.unitPricePaise,
      amountPaise: charge.amountPaise,
      taxPaise: charge.taxPaise,
      status: "INVOICED",
      invoiceId: input.invoiceId,
    },
  });
}

export async function ensureUpcomingPeriods(
  db: Prisma.TransactionClient,
  subscription: PeriodSubscription,
  taxBps: number,
  count = 3,
) {
  const periods = await db.billingPeriod.findMany({ where: { subscriptionId: subscription.id }, orderBy: { periodStart: "asc" } });
  let scheduled = periods.filter((period) => period.status === "SCHEDULED").length;
  let cursor = periods.length
    ? new Date(periods[periods.length - 1]!.periodEnd.getTime() + DAY_MS)
    : subscription.nextBillingAt;
  while (scheduled < count) {
    const period = calendarPeriod(cursor, subscription.plan.interval);
    const charge = periodCharge(subscription.qty, subscription.unitPricePaise, taxBps);
    await db.billingPeriod.create({
      data: {
        subscriptionId: subscription.id,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        qty: subscription.qty,
        unitPricePaise: subscription.unitPricePaise,
        amountPaise: charge.amountPaise,
        taxPaise: charge.taxPaise,
        status: "SCHEDULED",
      },
    });
    scheduled += 1;
    cursor = period.nextBillingAt;
  }
}

export async function skipScheduledPeriods(db: Prisma.TransactionClient, subscriptionId: number, from: Date) {
  await db.billingPeriod.updateMany({
    where: { subscriptionId, status: "SCHEDULED", periodStart: { gte: from } },
    data: { status: "SKIPPED" },
  });
}

export async function refreshScheduledPeriodCharges(
  db: Prisma.TransactionClient,
  subscription: PeriodSubscription,
  taxBps: number,
) {
  const charge = periodCharge(subscription.qty, subscription.unitPricePaise, taxBps);
  await db.billingPeriod.updateMany({
    where: { subscriptionId: subscription.id, status: "SCHEDULED" },
    data: { qty: subscription.qty, unitPricePaise: subscription.unitPricePaise, amountPaise: charge.amountPaise, taxPaise: charge.taxPaise },
  });
}
