import "server-only";
import { prisma } from "@/lib/prisma";
import { upcomingSchedule, upcomingScheduleFromPeriods } from "./schedule";
import { calendarPeriod, prorate } from "./prorate";
import { lineRequiresStock } from "@/modules/inventory/fulfillment-status";

export async function listSubscriptions() {
  return prisma.subscription.findMany({
    include: { plan: true, order: { include: { quote: { include: { customer: true } } } }, orderLine: { include: { product: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getBillingOrder(code: string) {
  const order = await prisma.order.findUnique({
    where: { code },
    include: {
      quote: { include: { customer: true } },
      lines: { include: { product: { include: { category: true } }, quoteLine: true, allocations: true } },
      subscriptions: { include: { plan: true, orderLine: { include: { product: true } }, changes: { orderBy: { effectiveAt: "desc" } }, billingPeriods: { orderBy: { periodStart: "asc" } } } },
      invoices: { include: { lines: true, payments: true, creditNotes: true }, orderBy: { issuedAt: "desc" } },
    },
  });
  if (!order) return null;
  return {
    order,
    schedules: order.subscriptions.map((subscription) => ({
      subscriptionId: subscription.id,
      rows: subscription.billingPeriods.length
        ? upcomingScheduleFromPeriods(subscription.billingPeriods)
        : upcomingSchedule(subscription, 3),
    })),
  };
}

export function listCustomerInvoices(customerId: number) {
  return prisma.invoice.findMany({
    where: { order: { quote: { customerId } } },
    include: { order: { include: { quote: { include: { customer: true } } } }, payments: true, creditNotes: true },
    orderBy: { issuedAt: "desc" },
  });
}

export function listInvoices(ownerId?: number, unpaidOnly = false) {
  return prisma.invoice.findMany({
    where: { ...(unpaidOnly ? { status: { in: ["UNPAID" as const, "PARTIAL" as const] } } : {}), ...(ownerId ? { order: { quote: { ownerId } } } : {}) },
    include: { order: { include: { quote: { include: { customer: true } } } }, payments: true, creditNotes: true },
    orderBy: { issuedAt: "desc" },
  });
}

export function getInvoice(code: string) {
  return prisma.invoice.findUnique({
    where: { code },
    include: {
      lines: { include: { orderLine: { include: { product: true } } } },
      payments: { include: { recordedBy: true }, orderBy: { receivedAt: "desc" } },
      creditNotes: { orderBy: { createdAt: "desc" } },
      order: { include: { quote: { include: { customer: true } }, lines: { include: { allocations: true } } } },
    },
  });
}

export async function getQuoteBillingPreview(quoteId: number) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { currentRevision: { include: { lines: { include: { product: { include: { plan: true, category: true } } } } } } } });
  if (!quote?.currentRevision) return null;
  const periodByPlan = new Map<number, ReturnType<typeof calendarPeriod>>();
  const lines = quote.currentRevision.lines.map((line) => {
    if (!line.product.isSubscription || !line.product.plan) {
      const fulfillment = lineRequiresStock(line.product);
      return {
        description: line.description,
        kind: fulfillment ? "FULFILLMENT" as const : "ONE_TIME" as const,
        amountPaise: line.netPaise + line.taxPaise,
        detail: fulfillment ? "Invoiced only for quantities marked shipped" : "Due 15 days after confirmation",
      };
    }
    const period = periodByPlan.get(line.product.plan.id) ?? calendarPeriod(new Date(), line.product.plan.interval);
    periodByPlan.set(line.product.plan.id, period);
    const first = prorate({ unitAmountPaise: Math.round(line.netPaise / line.qty), qtyDelta: line.qty, effectiveDate: new Date(), periodStart: period.periodStart, periodEnd: period.periodEnd, prorateChanges: true });
    return { description: line.description, kind: "RECURRING" as const, amountPaise: first.amountPaise + Math.round(first.amountPaise * line.product.taxBps / 10_000), detail: first.reason };
  });
  return {
    lines,
    confirmationPaise: lines.filter((line) => line.kind === "ONE_TIME").reduce((sum, line) => sum + line.amountPaise, 0),
    fulfillmentPaise: lines.filter((line) => line.kind === "FULFILLMENT").reduce((sum, line) => sum + line.amountPaise, 0),
    firstRecurringPaise: lines.filter((line) => line.kind === "RECURRING").reduce((sum, line) => sum + line.amountPaise, 0),
  };
}
