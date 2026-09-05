import "server-only";

import type { AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deliverySlippage, discountAnomaly, stalled, type DiscountQuoteInput, type HealthAlert, type SlippageInput, type StalledInput } from "./rules";

export type HealthAlertRow = HealthAlert & { actionTaken: string | null };

export async function getDealHealth(session: AppSession) {
  const owned = session.role === "REP" ? { ownerId: session.userId } : {};
  const [policy, quotes, history, backorders, receipts, recentDismissals, tasks] = await Promise.all([
    prisma.discountPolicy.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.quote.findMany({
      where: owned,
      include: {
        customer: true,
        owner: true,
        currentRevision: true,
        auditEvents: { include: { actor: true }, orderBy: { at: "desc" }, take: 1 },
      },
    }),
    prisma.quote.findMany({
      where: { ...owned, customerStatus: "CONFIRMED", currentRevision: { isNot: null } },
      include: { customer: true, owner: true, currentRevision: true },
    }),
    prisma.backorder.findMany({
      where: { consolidatedAt: null, orderLine: { order: { quote: owned } } },
      include: {
        orderLine: {
          include: {
            product: true,
            variant: true,
            order: { include: { quote: { include: { customer: true, owner: true } } } },
          },
        },
      },
    }),
    prisma.stockReceipt.findMany({ where: { receivedAt: null }, include: { warehouse: true } }),
    prisma.auditEvent.findMany({
      where: { action: "ALERT_DISMISSED", at: { gte: new Date(Date.now() - 7 * 86_400_000) }, quote: owned },
      select: { quoteId: true, meta: true },
    }),
    prisma.task.findMany({ where: { quote: owned }, orderBy: { createdAt: "desc" }, include: { createdBy: true } }),
  ]);

  const dismissed = new Set<string>();
  for (const event of recentDismissals) {
    const meta = event.meta && typeof event.meta === "object" && !Array.isArray(event.meta) ? event.meta as Record<string, unknown> : {};
    if (event.quoteId && typeof meta.kind === "string") dismissed.add(`${event.quoteId}:${meta.kind}`);
  }

  const stalledInputs: StalledInput[] = quotes.map((quote) => ({
    quoteId: quote.id,
    code: quote.code,
    customer: quote.customer.name,
    rep: quote.owner.name,
    ownerId: quote.ownerId,
    approvalStatus: quote.approvalStatus,
    customerStatus: quote.customerStatus,
    fulfillmentStatus: quote.fulfillmentStatus,
    lastActivityAt: quote.lastActivityAt,
    lastEvent: quote.auditEvents[0] ? { action: quote.auditEvents[0].action, actor: quote.auditEvents[0].actor?.name ?? "System", at: quote.auditEvents[0].at } : null,
  }));
  const asDiscountInput = (quote: typeof quotes[number] | typeof history[number]): DiscountQuoteInput => ({
    quoteId: quote.id,
    code: quote.code,
    customer: quote.customer.name,
    rep: quote.owner.name,
    ownerId: quote.ownerId,
    approvalStatus: quote.approvalStatus,
    customerStatus: quote.customerStatus,
    subtotalPaise: quote.currentRevision?.subtotalPaise ?? 0,
    discountPaise: quote.currentRevision?.discountPaise ?? 0,
    lastActivityAt: quote.lastActivityAt,
  });
  const slippageInputs: SlippageInput[] = backorders.flatMap((backorder) => {
    const order = backorder.orderLine.order;
    const promised = order.promisedDeliveryDate ?? order.quote.promisedDeliveryDate;
    if (!promised || !["PLANNED", "PARTIAL"].includes(order.quote.fulfillmentStatus)) return [];
    return [{
      quoteId: order.quote.id,
      code: order.quote.code,
      customer: order.quote.customer.name,
      rep: order.quote.owner.name,
      ownerId: order.quote.ownerId,
      orderCode: order.code,
      productId: backorder.orderLine.productId,
      variantId: backorder.orderLine.variantId,
      product: backorder.orderLine.product.name,
      variant: backorder.orderLine.variant?.attributeValue ?? null,
      qty: backorder.qty,
      promisedDeliveryDate: promised,
      backorderCreatedAt: backorder.createdAt,
      receipts: receipts.filter((receipt) => receipt.productId === backorder.orderLine.productId && receipt.variantId === backorder.orderLine.variantId).map((receipt) => ({ expectedAt: receipt.expectedAt, warehouse: receipt.warehouse.name })),
    }];
  });

  const alerts = [
    ...stalled(stalledInputs, policy.staleAfterDays, new Date(), dismissed),
    ...discountAnomaly(history.map(asDiscountInput), quotes.map(asDiscountInput), policy.anomalyDeltaBps, dismissed),
    ...deliverySlippage(slippageInputs, dismissed),
  ].toSorted((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.severity] - rank[b.severity] || a.flaggedSince.getTime() - b.flaggedSince.getTime();
  });

  const latestTaskByQuote = new Map<number, typeof tasks[number]>();
  for (const task of tasks) if (!latestTaskByQuote.has(task.quoteId)) latestTaskByQuote.set(task.quoteId, task);
  const rows: HealthAlertRow[] = alerts.map((alert) => {
    const task = latestTaskByQuote.get(alert.quoteId);
    return { ...alert, actionTaken: task ? `${task.kind === "NUDGE" ? "Nudged" : "Escalated"} by ${task.createdBy.name}` : null };
  });

  return {
    alerts: rows,
    counts: {
      stalled: rows.filter((alert) => alert.kind === "STALLED").length,
      anomalies: rows.filter((alert) => alert.kind === "DISCOUNT_ANOMALY").length,
      slippage: rows.filter((alert) => alert.kind === "DELIVERY_SLIPPAGE").length,
    },
    policy: { staleAfterDays: policy.staleAfterDays, anomalyDeltaBps: policy.anomalyDeltaBps },
  };
}
