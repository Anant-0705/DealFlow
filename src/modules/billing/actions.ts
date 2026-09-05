"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { nextCreditNoteCode, nextInvoiceCode } from "@/lib/codes";
import { parseRupees } from "@/lib/money";
import { calendarPeriod, prorate, subscriptionPeriod } from "./prorate";
import { parseDateInput } from "./date-input";
import { applyInvoicePayment } from "./apply-payment";

async function applyCredit(tx: Parameters<typeof logEvent>[0], invoiceId: number, amountPaise: number, reason: string) {
  const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const code = await nextCreditNoteCode(tx);
  const credit = await tx.creditNote.create({ data: { code, invoiceId, amountPaise, reason } });
  if (invoice.status !== "PAID") {
    const totalPaise = Math.max(invoice.paidPaise, invoice.totalPaise - amountPaise);
    const status = totalPaise === invoice.paidPaise ? "PAID" : invoice.paidPaise ? "PARTIAL" : "UNPAID";
    await tx.invoice.update({ where: { id: invoice.id }, data: { totalPaise, status } });
  }
  return credit;
}

export async function modifySubscription(formData: FormData) {
  const session = await requireRole(["FINANCE", "ADMIN"]);
  const subscriptionId = Number(formData.get("subscriptionId"));
  const newQty = Math.floor(Number(formData.get("newQty")));
  const effectiveAt = parseDateInput(formData.get("effectiveDate"));
  if (!Number.isInteger(newQty) || newQty < 0) throw new Error("Quantity must be zero or greater.");
  const orderCode = String(formData.get("orderCode") ?? "");
  await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUniqueOrThrow({ where: { id: subscriptionId }, include: { plan: true, order: true, orderLine: { include: { product: true } } } });
    if (subscription.status !== "ACTIVE") throw new Error("Only active subscriptions can be modified.");
    const qtyDelta = newQty - subscription.qty;
    if (!qtyDelta) return;
    const period = subscriptionPeriod(subscription.startsAt, effectiveAt, subscription.plan.interval);
    const result = prorate({ unitAmountPaise: subscription.unitPricePaise, qtyDelta, effectiveDate: effectiveAt, periodStart: period.periodStart, periodEnd: period.periodEnd, prorateChanges: subscription.plan.prorateChanges });
    await tx.subscriptionChange.create({ data: { subscriptionId, effectiveAt, qtyDelta, prorationPaise: result.amountPaise, reason: result.reason } });
    await tx.subscription.update({ where: { id: subscriptionId }, data: { qty: newQty } });
    if (result.amountPaise > 0) {
      const taxPaise = Math.round(result.amountPaise * subscription.orderLine.product.taxBps / 10_000);
      const code = await nextInvoiceCode(tx);
      const invoice = await tx.invoice.create({ data: { code, orderId: subscription.orderId, kind: "PRORATION", periodStart: period.periodStart, periodEnd: period.periodEnd, totalPaise: result.amountPaise + taxPaise, issuedAt: new Date(), dueAt: new Date(Date.now() + 15 * 86_400_000), lines: { create: { orderLineId: subscription.orderLineId, description: result.reason, qty: Math.abs(qtyDelta), unitPaise: subscription.unitPricePaise, taxPaise, totalPaise: result.amountPaise + taxPaise } } } });
      await logEvent(tx, { entity: "INVOICE", entityId: invoice.id, quoteId: subscription.order.quoteId, action: "INVOICE_ISSUED", actorId: session.userId, reason: `${code} issued for subscription proration.`, meta: { proration: result } });
    } else if (result.amountPaise < 0) {
      const invoice = await tx.invoice.findFirst({ where: { orderId: subscription.orderId, kind: "RECURRING", periodStart: { lte: effectiveAt }, periodEnd: { gte: effectiveAt }, lines: { some: { orderLineId: subscription.orderLineId } } }, orderBy: { issuedAt: "desc" } });
      if (invoice) {
        const credit = await applyCredit(tx, invoice.id, Math.abs(result.amountPaise), result.reason);
        await logEvent(tx, { entity: "CREDIT_NOTE", entityId: credit.id, quoteId: subscription.order.quoteId, action: "CREDIT_NOTE_ISSUED", actorId: session.userId, reason: result.reason });
      }
    }
    await logEvent(tx, { entity: "SUBSCRIPTION", entityId: subscription.id, quoteId: subscription.order.quoteId, action: "SUBSCRIPTION_MODIFIED", actorId: session.userId, reason: result.reason, meta: { oldQty: subscription.qty, newQty, proration: result } });
  }, { isolationLevel: "Serializable" });
  revalidatePath(`/app/billing/${orderCode}`);
  revalidatePath("/app/invoices");
}

export async function cancelSubscription(formData: FormData) {
  const session = await requireRole(["FINANCE", "ADMIN"]);
  const subscriptionId = Number(formData.get("subscriptionId"));
  const effectiveAt = parseDateInput(formData.get("effectiveDate"));
  const orderCode = String(formData.get("orderCode") ?? "");
  await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUniqueOrThrow({ where: { id: subscriptionId }, include: { plan: true, order: true } });
    if (subscription.status === "CANCELLED") return;
    const period = subscriptionPeriod(subscription.startsAt, effectiveAt, subscription.plan.interval);
    const result = prorate({ unitAmountPaise: subscription.unitPricePaise, qtyDelta: -subscription.qty, effectiveDate: effectiveAt, periodStart: period.periodStart, periodEnd: period.periodEnd, prorateChanges: subscription.plan.creditOnCancel });
    await tx.subscription.update({ where: { id: subscription.id }, data: { status: "CANCELLED" } });
    if (result.amountPaise < 0) {
      const invoice = await tx.invoice.findFirst({ where: { orderId: subscription.orderId, kind: "RECURRING", periodStart: { lte: effectiveAt }, periodEnd: { gte: effectiveAt }, lines: { some: { orderLineId: subscription.orderLineId } } }, orderBy: { issuedAt: "desc" } });
      if (invoice) {
        const credit = await applyCredit(tx, invoice.id, Math.abs(result.amountPaise), result.reason);
        await logEvent(tx, { entity: "CREDIT_NOTE", entityId: credit.id, quoteId: subscription.order.quoteId, action: "CREDIT_NOTE_ISSUED", actorId: session.userId, reason: result.reason });
      }
    }
    await logEvent(tx, { entity: "SUBSCRIPTION", entityId: subscription.id, quoteId: subscription.order.quoteId, action: "SUBSCRIPTION_CANCELLED", actorId: session.userId, reason: result.reason, meta: { proration: result } });
  }, { isolationLevel: "Serializable" });
  revalidatePath(`/app/billing/${orderCode}`);
  revalidatePath("/app/invoices");
}

export async function runBillingAsOf(formData: FormData) {
  const session = await requireRole(["FINANCE", "ADMIN"]);
  const asOf = parseDateInput(formData.get("asOf"));
  const result = await prisma.$transaction(async (tx) => {
    const subscriptions = await tx.subscription.findMany({ where: { status: "ACTIVE", nextBillingAt: { lte: asOf } }, include: { plan: true, order: true, orderLine: { include: { product: true } } } });
    let generated = 0; let skipped = 0;
    for (const subscription of subscriptions) {
      const period = calendarPeriod(subscription.nextBillingAt, subscription.plan.interval);
      const existing = await tx.invoice.findFirst({ where: { orderId: subscription.orderId, kind: "RECURRING", periodStart: period.periodStart, lines: { some: { orderLineId: subscription.orderLineId } } } });
      if (existing) skipped++;
      else {
        const amountPaise = subscription.unitPricePaise * subscription.qty;
        const taxPaise = Math.round(amountPaise * subscription.orderLine.product.taxBps / 10_000);
        const code = await nextInvoiceCode(tx);
        const invoice = await tx.invoice.create({ data: { code, orderId: subscription.orderId, kind: "RECURRING", periodStart: period.periodStart, periodEnd: period.periodEnd, totalPaise: amountPaise + taxPaise, issuedAt: new Date(), dueAt: new Date(Date.now() + 15 * 86_400_000), lines: { create: { orderLineId: subscription.orderLineId, description: `${subscription.orderLine.product.name} · full ${subscription.plan.interval.toLowerCase()} period`, qty: subscription.qty, unitPaise: subscription.unitPricePaise, taxPaise, totalPaise: amountPaise + taxPaise } } } });
        generated++;
        await logEvent(tx, { entity: "INVOICE", entityId: invoice.id, quoteId: subscription.order.quoteId, action: "INVOICE_ISSUED", actorId: session.userId, reason: `${code} generated by billing run.` });
      }
      await tx.subscription.update({ where: { id: subscription.id }, data: { nextBillingAt: period.nextBillingAt } });
    }
    await logEvent(tx, { entity: "BILLING", entityId: 1, action: "BILLING_RUN", actorId: session.userId, reason: `Generated ${generated} invoices, skipped ${skipped} already billed.`, meta: { asOf: asOf.toISOString(), generated, skipped } });
    return { generated, skipped };
  }, { isolationLevel: "Serializable" });
  redirect(`/app/billing?notice=${encodeURIComponent(`Generated ${result.generated} invoices, skipped ${result.skipped} already billed.`)}`);
}

export async function issueCreditNote(formData: FormData) {
  const session = await requireRole(["FINANCE", "ADMIN"]);
  const invoiceId = Number(formData.get("invoiceId"));
  const amountPaise = parseRupees(formData.get("amountRupees"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (amountPaise <= 0 || reason.length < 3) throw new Error("Enter a positive credit and a reason.");
  const invoiceCode = String(formData.get("invoiceCode") ?? "");
  await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { order: true } });
    const balance = invoice.totalPaise - invoice.paidPaise;
    if (amountPaise > balance && invoice.status !== "PAID") throw new Error("Credit exceeds the unpaid balance.");
    const credit = await applyCredit(tx, invoice.id, amountPaise, reason);
    await logEvent(tx, { entity: "CREDIT_NOTE", entityId: credit.id, quoteId: invoice.order.quoteId, action: "CREDIT_NOTE_ISSUED", actorId: session.userId, reason, meta: { amountPaise } });
  });
  revalidatePath(`/app/invoices/${invoiceCode}`);
}

export async function recordPayment(formData: FormData) {
  const session = await requireRole(["FINANCE", "ADMIN"]);
  const invoiceCode = String(formData.get("invoiceCode") ?? "");
  const amountPaise = parseRupees(formData.get("amountRupees"));
  const reference = String(formData.get("reference") ?? "").trim();
  const method = String(formData.get("method") ?? "Bank transfer").trim();
  const receivedAt = parseDateInput(formData.get("receivedAt"));
  if (amountPaise <= 0 || !reference) throw new Error("Enter a positive amount and payment reference.");
  const outcome = await prisma.$transaction(async (tx) => {
    return applyInvoicePayment(tx, { invoiceCode, amountPaise, reference, method, receivedAt, recordedById: session.userId });
  }, { isolationLevel: "Serializable" });
  redirect(`/app/invoices/${invoiceCode}?notice=${encodeURIComponent(outcome.duplicate ? "Payment already recorded" : "Payment recorded")}`);
}
