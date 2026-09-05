import "server-only";

import type { AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allocateInventory } from "@/modules/inventory/allocate";
import { assignReceiptsToDemands, deliverySlippage, discountAnomaly, stalled, type DiscountQuoteInput, type HealthAlert, type SlippageInput, type StalledInput } from "./rules";

export type ScheduleReceiptDraft = {
  warehouseId: number;
  productId: number;
  variantId: number | null;
  qty: number;
  expectedAt: string;
};

export type HealthAlertRow = HealthAlert & {
  actionTaken: string | null;
  scheduleReceipt?: ScheduleReceiptDraft;
};

export type ExpectedReceiptRow = {
  id: number;
  warehouse: string;
  product: string;
  variant: string | null;
  qty: number;
  expectedAt: Date;
};

export async function getDealHealth(session: AppSession) {
  const owned = session.role === "REP" ? { ownerId: session.userId } : {};
  const [policy, quotes, history, openOrders, stock, warehouses, receipts, recentDismissals, tasks] = await Promise.all([
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
    prisma.order.findMany({
      where: { quote: { ...owned, fulfillmentStatus: { in: ["PLANNED", "PARTIAL"] } } },
      include: {
        quote: { include: { customer: true, owner: true } },
        lines: { include: { product: { include: { category: true } }, variant: true, backorders: true } },
      },
    }),
    prisma.stock.findMany({ select: { warehouseId: true, productId: true, variantId: true, onHand: true, reserved: true } }),
    prisma.warehouse.findMany({ where: { active: true }, orderBy: { id: "asc" }, select: { id: true, name: true, shippingCostWeightPaise: true, replenishmentLeadDays: true } }),
    prisma.stockReceipt.findMany({ where: { receivedAt: null }, include: { warehouse: true, product: true, variant: true } }),
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
  const slippageCandidates: SlippageInput[] = [];
  for (const order of openOrders) {
    const promised = order.promisedDeliveryDate ?? order.quote.promisedDeliveryDate;
    if (!promised) continue;
    const openBackorders = order.lines.flatMap((line) => line.backorders.filter((backorder) => !backorder.consolidatedAt && backorder.qty > 0).map((backorder) => ({ line, backorder })));
    if (openBackorders.length) {
      for (const { line, backorder } of openBackorders) {
        slippageCandidates.push({
          quoteId: order.quote.id,
          code: order.quote.code,
          customer: order.quote.customer.name,
          rep: order.quote.owner.name,
          ownerId: order.quote.ownerId,
          orderCode: order.code,
          productId: line.productId,
          variantId: line.variantId,
          product: line.product.name,
          variant: line.variant?.attributeValue ?? null,
          qty: backorder.qty,
          promisedDeliveryDate: promised,
          backorderCreatedAt: backorder.createdAt,
          receipts: [],
        });
      }
      continue;
    }
    const plan = allocateInventory(
      order.lines.map((line) => ({
        lineId: line.id,
        productId: line.productId,
        variantId: line.variantId,
        description: line.product.name,
        variantLabel: line.variant?.attributeValue,
        qty: line.qty,
        requiresStock: !line.product.isSubscription && line.product.category.name.toLowerCase() !== "services",
      })),
      stock,
      warehouses,
    );
    for (const line of plan.lines) {
      if (!line.backorderQty) continue;
      const source = order.lines.find((item) => item.id === line.lineId) ?? order.lines.find((item) => item.productId === line.productId && item.variantId === line.variantId);
      slippageCandidates.push({
        quoteId: order.quote.id,
        code: order.quote.code,
        customer: order.quote.customer.name,
        rep: order.quote.owner.name,
        ownerId: order.quote.ownerId,
        orderCode: order.code,
        productId: line.productId,
        variantId: line.variantId,
        product: source?.product.name ?? line.description,
        variant: source?.variant?.attributeValue ?? null,
        qty: line.backorderQty,
        promisedDeliveryDate: promised,
        backorderCreatedAt: order.confirmedAt,
        receipts: [],
      });
    }
  }
  const assignedReceipts = assignReceiptsToDemands(
    slippageCandidates.map((item, index) => ({
      key: `${item.orderCode}:${item.productId}:${item.variantId ?? "base"}:${index}`,
      productId: item.productId,
      variantId: item.variantId,
      qty: item.qty,
      createdAt: item.backorderCreatedAt,
    })),
    receipts.map((receipt) => ({
      productId: receipt.productId,
      variantId: receipt.variantId,
      qty: receipt.qty,
      expectedAt: receipt.expectedAt,
      warehouse: receipt.warehouse.name,
      warehouseId: receipt.warehouseId,
    })),
  );
  const slippageInputs: SlippageInput[] = slippageCandidates.map((item, index) => ({
    ...item,
    receipts: assignedReceipts.get(`${item.orderCode}:${item.productId}:${item.variantId ?? "base"}:${index}`) ?? [],
  }));

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
    const source = alert.kind === "DELIVERY_SLIPPAGE"
      ? slippageInputs.find((item) => item.quoteId === alert.quoteId && item.productId === alert.productId && item.variantId === alert.variantId)
      : undefined;
    const warehouseId = source
      ? source.receipts[0]?.warehouseId
        ?? stock.find((row) => row.productId === source.productId && row.variantId === source.variantId)?.warehouseId
        ?? warehouses[0]?.id
      : undefined;
    return {
      ...alert,
      actionTaken: task ? `${task.kind === "NUDGE" ? "Nudged" : "Escalated"} by ${task.createdBy.name}` : null,
      scheduleReceipt: source && warehouseId
        ? {
            warehouseId,
            productId: source.productId,
            variantId: source.variantId,
            qty: alert.neededQty ?? source.qty,
            expectedAt: source.promisedDeliveryDate.toISOString().slice(0, 10),
          }
        : undefined,
    };
  });

  return {
    alerts: rows,
    counts: {
      stalled: rows.filter((alert) => alert.kind === "STALLED").length,
      anomalies: rows.filter((alert) => alert.kind === "DISCOUNT_ANOMALY").length,
      slippage: rows.filter((alert) => alert.kind === "DELIVERY_SLIPPAGE").length,
    },
    policy: { staleAfterDays: policy.staleAfterDays, anomalyDeltaBps: policy.anomalyDeltaBps },
    expectedReceipts: receipts.map((receipt) => ({
      id: receipt.id,
      warehouse: receipt.warehouse.name,
      product: receipt.product.name,
      variant: receipt.variant?.attributeValue ?? null,
      qty: receipt.qty,
      expectedAt: receipt.expectedAt,
    })),
  };
}
