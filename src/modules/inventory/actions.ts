"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { formObject } from "@/lib/validation";
import { receiptSchema, scheduleReceiptSchema, stockSchema, warehouseSchema } from "./schemas";
import { reserveSuggestedAllocations, lockProductStock } from "./reserve";
import { findConsolidatableBackorders } from "./receipts";
import { promisedDeliveryDate } from "./promise";
import { fulfillmentStatusForLines, orderAlreadyPlanned } from "./fulfillment-status";
import { issueFulfillmentInvoice } from "@/modules/billing/fulfillment";
import { assertNoOpenConfirmationDispute } from "@/modules/negotiation/trust";

async function requireMatchingVariant(tx: Parameters<typeof logEvent>[0], productId: number, variantId: number | null) {
  if (variantId === null) return;
  const variant = await tx.productVariant.findFirst({ where: { id: variantId, productId }, select: { id: true } });
  if (!variant) throw new Error("The selected variant does not belong to this product.");
}

export async function saveWarehouse(formData: FormData) {
  const session = await requireRole(["ADMIN"]); const value = warehouseSchema.parse(formObject(formData));
  const data = { name: value.name, code: value.code, shippingCostWeightPaise: Math.round(value.shippingCostRupees * 100), replenishmentLeadDays: value.replenishmentLeadDays, active: value.active };
  await prisma.$transaction(async (tx) => { const row = value.id ? await tx.warehouse.update({ where: { id: value.id }, data }) : await tx.warehouse.create({ data }); await logEvent(tx, { entity: "WAREHOUSE", entityId: row.id, action: "SETTINGS_CHANGED", actorId: session.userId, reason: value.id ? "Warehouse updated" : "Warehouse created", meta: data }); });
  revalidatePath("/app/settings/warehouses");
}

export async function saveStock(formData: FormData) {
  const session = await requireRole(["ADMIN"]); const value = stockSchema.parse(formObject(formData));
  await prisma.$transaction(async (tx) => {
    await requireMatchingVariant(tx, value.productId, value.variantId);
    const existing = await tx.stock.findFirst({ where: { warehouseId: value.warehouseId, productId: value.productId, variantId: value.variantId } });
    if (existing && value.onHand < existing.reserved) {
      throw new Error(`On-hand stock cannot be lower than the ${existing.reserved} units already reserved.`);
    }
    const replenishment = { reorderPoint: value.reorderPoint, reorderQty: value.reorderQty, maxOnHand: value.maxOnHand };
    const row = existing
      ? await tx.stock.update({ where: { id: existing.id }, data: { onHand: value.onHand, ...replenishment } })
      : await tx.stock.create({ data: { warehouseId: value.warehouseId, productId: value.productId, variantId: value.variantId, onHand: value.onHand, reserved: 0, ...replenishment } });
    await logEvent(tx, { entity: "STOCK", entityId: row.id, action: "SETTINGS_CHANGED", actorId: session.userId, reason: "On-hand stock updated", meta: { onHand: value.onHand, ...replenishment } });
  });
  revalidatePath("/app/settings/warehouses");
}

async function updateFulfillmentStatus(tx: Parameters<typeof logEvent>[0], orderId: number) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { lines: { include: { allocations: true, backorders: true, product: { include: { category: true } } } } },
  });
  const status = fulfillmentStatusForLines(order.lines);
  await tx.quote.update({ where: { id: order.quoteId }, data: { fulfillmentStatus: status, lastActivityAt: new Date() } });
  return status;
}

export async function acceptSuggestedSplit(formData: FormData) {
  const session = await requireRole(["FINANCE", "ADMIN"]);
  const orderCode = String(formData.get("orderCode") ?? "");
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { code: orderCode } });
    await assertNoOpenConfirmationDispute(tx, order.quoteId);
    const plan = await reserveSuggestedAllocations(tx, order.id);
    const [warehouses, receipts] = await Promise.all([
      tx.warehouse.findMany({ where: { active: true }, select: { id: true, name: true, shippingCostWeightPaise: true, replenishmentLeadDays: true } }),
      tx.stockReceipt.findMany({ where: { receivedAt: null }, select: { productId: true, variantId: true, qty: true, expectedAt: true, receivedAt: true } }),
    ]);
    await tx.order.update({ where: { id: order.id }, data: { promisedDeliveryDate: promisedDeliveryDate({ confirmedAt: order.confirmedAt, plan, warehouses, receipts }) } });
    const status = await updateFulfillmentStatus(tx, order.id);
    await logEvent(tx, { entity: "ORDER", entityId: order.id, quoteId: order.quoteId, action: "SPLIT_ACCEPTED", actorId: session.userId, reason: `${plan.totalShipments} shipment plan accepted; fulfillment is ${status.toLowerCase()}.`, meta: JSON.parse(JSON.stringify(plan)) });
    return plan;
  }, { isolationLevel: "Serializable" });
  revalidatePath(`/app/fulfillment/${orderCode}`);
  revalidatePath("/app/fulfillment");
  void result;
}

export async function manualOverride(formData: FormData) {
  const session = await requireRole(["FINANCE", "ADMIN"]);
  const orderCode = String(formData.get("orderCode") ?? "");
  await prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe<Array<{ id: number }>>('SELECT "id" FROM "Order" WHERE "code" = $1 FOR UPDATE', orderCode);
    const order = await tx.order.findUniqueOrThrow({ where: { code: orderCode }, include: { lines: { include: { allocations: true, backorders: true, product: { include: { category: true } } } } } });
    await assertNoOpenConfirmationDispute(tx, order.quoteId);
    if (orderAlreadyPlanned(order.lines)) throw new Error("This order already has a fulfillment plan.");
    for (const productId of [...new Set(order.lines.map((line) => line.productId))]) await lockProductStock(tx, productId);
    const before = await tx.stock.findMany({ where: { productId: { in: order.lines.map((line) => line.productId) } } });
    const remaining = new Map(before.map((item) => [item.id, Math.max(0, item.onHand - item.reserved)]));
    const requested = [...formData.entries()].filter(([key]) => key.startsWith("alloc:")).map(([key, value]) => {
      const [, lineId, warehouseId] = key.split(":");
      return { lineId: Number(lineId), warehouseId: Number(warehouseId), qty: Math.max(0, Math.floor(Number(value) || 0)) };
    }).filter((row) => row.qty > 0);
    const stockLines = order.lines.filter((line) => !line.product.isSubscription && line.product.category.name.toLowerCase() !== "services");
    const stockLineIds = new Set(stockLines.map((line) => line.id));
    if (requested.some((row) => !stockLineIds.has(row.lineId))) throw new Error("Manual allocation contains an invalid order line.");
    const requestedWarehouseIds = [...new Set(requested.map((row) => row.warehouseId))];
    const activeWarehouses = await tx.warehouse.findMany({ where: { id: { in: requestedWarehouseIds }, active: true }, select: { id: true, name: true } });
    const warehouseMap = new Map(activeWarehouses.map((warehouse) => [warehouse.id, warehouse]));
    if (warehouseMap.size !== requestedWarehouseIds.length) throw new Error("Manual allocations must use active warehouses.");
    for (const line of stockLines) {
      const rows = requested.filter((row) => row.lineId === line.id);
      if (rows.reduce((sum, row) => sum + row.qty, 0) > line.qty) throw new Error("Manual allocation exceeds the ordered quantity.");
      for (const row of rows) {
        const stock = before.find((item) => item.warehouseId === row.warehouseId && item.productId === line.productId && item.variantId === line.variantId);
        const available = stock ? remaining.get(stock.id) ?? 0 : 0;
        const warehouse = warehouseMap.get(row.warehouseId)!;
        if (!stock || row.qty > available) throw new Error(`${warehouse.name} has only ${Math.max(0, available)} available.`);
        await tx.stock.update({ where: { id: stock.id }, data: { reserved: { increment: row.qty } } });
        remaining.set(stock.id, available - row.qty);
        await tx.allocation.create({ data: { orderLineId: line.id, warehouseId: row.warehouseId, qty: row.qty, reserved: true, reason: "Manual allocation override." } });
      }
      const remainder = line.qty - rows.reduce((sum, row) => sum + row.qty, 0);
      if (remainder) await tx.backorder.create({ data: { orderLineId: line.id, qty: remainder } });
    }
    const status = await updateFulfillmentStatus(tx, order.id);
    await logEvent(tx, { entity: "ORDER", entityId: order.id, quoteId: order.quoteId, action: "SPLIT_OVERRIDDEN", actorId: session.userId, reason: `Manual warehouse split saved; fulfillment is ${status.toLowerCase()}.`, meta: { allocations: requested } });
  }, { isolationLevel: "Serializable" });
  revalidatePath(`/app/fulfillment/${orderCode}`);
  revalidatePath("/app/fulfillment");
}

export async function scheduleStockReceipt(formData: FormData) {
  const session = await requireRole(["FINANCE", "ADMIN"]);
  const value = scheduleReceiptSchema.parse({
    warehouseId: formData.get("warehouseId"),
    productId: formData.get("productId"),
    variantId: formData.get("variantId"),
    qty: formData.get("qty"),
    expectedAt: formData.get("expectedAt"),
  });
  await prisma.$transaction(async (tx) => {
    await requireMatchingVariant(tx, value.productId, value.variantId);
    const receipt = await tx.stockReceipt.create({ data: { warehouseId: value.warehouseId, productId: value.productId, variantId: value.variantId, qty: value.qty, expectedAt: value.expectedAt } });
    await logEvent(tx, { entity: "STOCK", entityId: receipt.id, action: "REPLENISHMENT_SCHEDULED", actorId: session.userId, reason: `${value.qty} units scheduled for ${value.expectedAt.toISOString().slice(0, 10)}.`, meta: value });
  });
  revalidatePath("/app/fulfillment");
  revalidatePath("/app/settings/warehouses");
  revalidatePath("/app/deal-health");
  revalidatePath("/app/dashboard");
}

export async function recordStockReceipt(formData: FormData) {
  const session = await requireRole(["FINANCE", "ADMIN"]);
  const value = receiptSchema.parse({ warehouseId: formData.get("warehouseId"), productId: formData.get("productId"), variantId: formData.get("variantId"), qty: formData.get("qty"), receiptId: formData.get("receiptId") });
  const orderCodes = await prisma.$transaction(async (tx) => {
    await requireMatchingVariant(tx, value.productId, value.variantId);
    if (value.receiptId) {
      await tx.$queryRawUnsafe<Array<{ id: number }>>('SELECT "id" FROM "StockReceipt" WHERE "id" = $1 FOR UPDATE', value.receiptId);
      const receipt = await tx.stockReceipt.findUniqueOrThrow({ where: { id: value.receiptId } });
      if (receipt.warehouseId !== value.warehouseId || receipt.productId !== value.productId || receipt.variantId !== value.variantId) {
        throw new Error("This receipt does not match the selected warehouse and product.");
      }
      if (receipt.receivedAt) return [];
    }
    await lockProductStock(tx, value.productId);
    const stock = await tx.stock.findFirst({ where: { warehouseId: value.warehouseId, productId: value.productId, variantId: value.variantId } });
    const row = stock ? await tx.stock.update({ where: { id: stock.id }, data: { onHand: { increment: value.qty } } }) : await tx.stock.create({ data: { warehouseId: value.warehouseId, productId: value.productId, variantId: value.variantId, onHand: value.qty, reserved: 0 } });
    if (value.receiptId) await tx.stockReceipt.update({ where: { id: value.receiptId }, data: { receivedAt: new Date(), qty: value.qty } });
    else await tx.stockReceipt.create({ data: { warehouseId: value.warehouseId, productId: value.productId, variantId: value.variantId, qty: value.qty, expectedAt: new Date(), receivedAt: new Date() } });
    const candidates = await findConsolidatableBackorders(tx, value.productId, value.variantId);
    const uniqueQuotes = new Map(candidates.map((item) => [item.orderLine.order.quoteId, item.orderLine.order]));
    if (!uniqueQuotes.size) await logEvent(tx, { entity: "STOCK", entityId: row.id, action: "STOCK_RECEIVED", actorId: session.userId, reason: `${value.qty} units received into stock.` });
    for (const order of uniqueQuotes.values()) await logEvent(tx, { entity: "STOCK", entityId: row.id, quoteId: order.quoteId, action: "STOCK_RECEIVED", actorId: session.userId, reason: `${value.qty} units received; ${order.code} can consolidate a backorder.`, meta: { warehouseId: value.warehouseId, productId: value.productId, variantId: value.variantId } });
    return candidates.map((item) => item.orderLine.order.code);
  }, { isolationLevel: "Serializable" });
  for (const code of orderCodes) revalidatePath(`/app/fulfillment/${code}`);
  revalidatePath("/app/fulfillment");
  revalidatePath("/app/deal-health");
  revalidatePath("/app/dashboard");
}

export async function consolidateBackorder(formData: FormData) {
  const session = await requireRole(["FINANCE", "ADMIN"]);
  const backorderId = Number(formData.get("backorderId"));
  const orderCode = String(formData.get("orderCode") ?? "");
  await prisma.$transaction(async (tx) => {
    const backorder = await tx.backorder.findUniqueOrThrow({ where: { id: backorderId }, include: { orderLine: { include: { order: true } } } });
    await assertNoOpenConfirmationDispute(tx, backorder.orderLine.order.quoteId);
    if (backorder.consolidatedAt || backorder.qty <= 0) throw new Error("This backorder is already consolidated.");
    await lockProductStock(tx, backorder.orderLine.productId);
    const stocks = await tx.stock.findMany({ where: { productId: backorder.orderLine.productId, variantId: backorder.orderLine.variantId, warehouse: { active: true } }, include: { warehouse: true } });
    stocks.sort((a, b) => (b.onHand - b.reserved) - (a.onHand - a.reserved) || a.warehouse.shippingCostWeightPaise - b.warehouse.shippingCostWeightPaise || a.warehouseId - b.warehouseId);
    const stock = stocks.find((item) => item.onHand - item.reserved > 0);
    if (!stock) throw new Error("No stock is currently available for this backorder.");
    const qty = Math.min(backorder.qty, stock.onHand - stock.reserved);
    await tx.stock.update({ where: { id: stock.id }, data: { reserved: { increment: qty } } });
    await tx.allocation.create({ data: { orderLineId: backorder.orderLineId, warehouseId: stock.warehouseId, qty, reserved: true, reason: "Consolidated from received stock." } });
    if (qty === backorder.qty) await tx.backorder.update({ where: { id: backorder.id }, data: { consolidatedAt: new Date() } });
    else await tx.backorder.update({ where: { id: backorder.id }, data: { qty: { decrement: qty } } });
    const status = await updateFulfillmentStatus(tx, backorder.orderLine.orderId);
    await logEvent(tx, { entity: "BACKORDER", entityId: backorder.id, quoteId: backorder.orderLine.order.quoteId, action: "BACKORDER_CONSOLIDATED", actorId: session.userId, reason: `${qty} unit${qty === 1 ? "" : "s"} allocated from ${stock.warehouse.name}; fulfillment is ${status.toLowerCase()}.`, meta: { warehouseId: stock.warehouseId, qty } });
  }, { isolationLevel: "Serializable" });
  revalidatePath(`/app/fulfillment/${orderCode}`);
  revalidatePath("/app/fulfillment");
}

export async function markShipped(formData: FormData) {
  const session = await requireRole(["FINANCE", "ADMIN"]);
  const allocationId = Number(formData.get("allocationId"));
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe<Array<{ id: number }>>('SELECT "id" FROM "Allocation" WHERE "id" = $1 FOR UPDATE', allocationId);
    const allocation = await tx.allocation.findUniqueOrThrow({
      where: { id: allocationId },
      include: { orderLine: { include: { order: true, quoteLine: true } } },
    });
    await assertNoOpenConfirmationDispute(tx, allocation.orderLine.order.quoteId);
    if (allocation.shippedAt) {
      const invoiceLine = await tx.invoiceLine.findUnique({ where: { allocationId }, include: { invoice: true } });
      return { orderCode: allocation.orderLine.order.code, qty: allocation.qty, invoiceCode: invoiceLine?.invoice.code ?? null, alreadyShipped: true };
    }
    await lockProductStock(tx, allocation.orderLine.productId);
    const stock = await tx.stock.findFirstOrThrow({ where: { warehouseId: allocation.warehouseId, productId: allocation.orderLine.productId, variantId: allocation.orderLine.variantId } });
    const shippedAt = new Date();
    await tx.stock.update({ where: { id: stock.id }, data: { onHand: { decrement: allocation.qty }, reserved: { decrement: allocation.qty } } });
    await tx.allocation.update({ where: { id: allocation.id }, data: { shippedAt, reserved: false } });
    const status = await updateFulfillmentStatus(tx, allocation.orderLine.orderId);
    await logEvent(tx, { entity: "ALLOCATION", entityId: allocation.id, quoteId: allocation.orderLine.order.quoteId, action: "SHIPPED", actorId: session.userId, reason: `${allocation.qty} unit${allocation.qty === 1 ? "" : "s"} shipped; fulfillment is ${status.toLowerCase()}.` });
    const billing = await issueFulfillmentInvoice(tx, {
      allocationId: allocation.id,
      orderId: allocation.orderLine.orderId,
      orderLineId: allocation.orderLineId,
      quoteId: allocation.orderLine.order.quoteId,
      actorId: session.userId,
      orderedQty: allocation.orderLine.qty,
      shipmentQty: allocation.qty,
      description: allocation.orderLine.quoteLine.description,
      quotedNetPaise: allocation.orderLine.quoteLine.netPaise,
      quotedTaxPaise: allocation.orderLine.quoteLine.taxPaise,
      issuedAt: shippedAt,
    });
    return { orderCode: allocation.orderLine.order.code, qty: allocation.qty, invoiceCode: billing?.invoice.code ?? null, alreadyShipped: false };
  }, { isolationLevel: "Serializable" });
  revalidatePath(`/app/fulfillment/${result.orderCode}`);
  revalidatePath("/app/fulfillment");
  revalidatePath("/app/invoices");
  revalidatePath(`/app/billing/${result.orderCode}`);
  revalidatePath("/portal/invoices");
  const notice = result.alreadyShipped
    ? result.invoiceCode ? `Shipment already recorded · ${result.invoiceCode}` : "Shipment already recorded"
    : result.invoiceCode ? `${result.qty} shipped · ${result.invoiceCode} issued for this shipment` : `${result.qty} shipped · already covered by an existing invoice`;
  redirect(`/app/fulfillment/${result.orderCode}?notice=${encodeURIComponent(notice)}`);
}
