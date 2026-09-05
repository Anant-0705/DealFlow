"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { nextInvoiceCode } from "@/lib/codes";
import { parseRupees } from "@/lib/money";
import { calendarPeriod, dueBillingPeriods, prorate, subscriptionPeriod } from "./prorate";
import { assertEffectiveToday, parseDateInput } from "./date-input";
import { applyInvoicePayment, refreshQuotePaymentStatus } from "./apply-payment";
import { grossPaise, invoiceRemainingPaise } from "./invoice-balance";
import { applyInvoiceCredit, applySubscriptionCredit } from "./credit";
import { ensureUpcomingPeriods, refreshScheduledPeriodCharges, skipScheduledPeriods } from "./periods";
import { periodCharge } from "./schedule";

export async function modifySubscription(formData: FormData) {
  const session = await requireRole(["FINANCE", "ADMIN"]);
  const subscriptionId = Number(formData.get("subscriptionId"));
  const newQty = Math.floor(Number(formData.get("newQty")));
  const effectiveAt = parseDateInput(formData.get("effectiveDate"));
  assertEffectiveToday(effectiveAt);
  if (!Number.isInteger(newQty) || newQty < 0) throw new Error("Quantity must be zero or greater.");
  const orderCode = String(formData.get("orderCode") ?? "");
  await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUniqueOrThrow({ where: { id: subscriptionId }, include: { plan: true, order: true, orderLine: { include: { product: true } } } });
    if (subscription.status !== "ACTIVE") throw new Error("Only active subscriptions can be modified.");
    const qtyDelta = newQty - subscription.qty;
    if (!qtyDelta) return;
    const period = subscriptionPeriod(subscription.startsAt, effectiveAt, subscription.plan.interval);
    const result = prorate({ unitAmountPaise: subscription.unitPricePaise, qtyDelta, effectiveDate: effectiveAt, periodStart: period.periodStart, periodEnd: period.periodEnd, prorateChanges: subscription.plan.prorateChanges });
    const taxBps = subscription.orderLine.product.taxBps;
    await tx.subscriptionChange.create({ data: { subscriptionId, effectiveAt, qtyDelta, prorationPaise: result.amountPaise, reason: result.reason } });
    const updated = await tx.subscription.update({ where: { id: subscriptionId }, data: { qty: newQty } });
    await refreshScheduledPeriodCharges(tx, { ...updated, plan: subscription.plan }, taxBps);
    if (result.amountPaise > 0) {
      const taxPaise = Math.round(result.amountPaise * taxBps / 10_000);
      const code = await nextInvoiceCode(tx);
      const invoice = await tx.invoice.create({ data: { code, orderId: subscription.orderId, kind: "PRORATION", periodStart: period.periodStart, periodEnd: period.periodEnd, totalPaise: result.amountPaise + taxPaise, issuedAt: new Date(), dueAt: new Date(Date.now() + 15 * 86_400_000), lines: { create: { orderLineId: subscription.orderLineId, description: result.reason, qty: Math.abs(qtyDelta), unitPaise: subscription.unitPricePaise, taxPaise, totalPaise: result.amountPaise + taxPaise } } } });
      await logEvent(tx, { entity: "INVOICE", entityId: invoice.id, quoteId: subscription.order.quoteId, action: "INVOICE_ISSUED", actorId: session.userId, reason: `${code} issued for subscription proration.`, meta: { proration: result } });
      await refreshQuotePaymentStatus(tx, subscription.orderId);
    } else if (result.amountPaise < 0) {
      const credit = await applySubscriptionCredit(tx, { orderId: subscription.orderId, orderLineId: subscription.orderLineId, amountPaise: Math.abs(grossPaise(result.amountPaise, taxBps)), reason: result.reason });
      await logEvent(tx, { entity: "CREDIT_NOTE", entityId: credit.id, quoteId: subscription.order.quoteId, action: "CREDIT_NOTE_ISSUED", actorId: session.userId, reason: result.reason });
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
  assertEffectiveToday(effectiveAt);
  const orderCode = String(formData.get("orderCode") ?? "");
  await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUniqueOrThrow({ where: { id: subscriptionId }, include: { plan: true, order: true, orderLine: { include: { product: true } } } });
    if (subscription.status === "CANCELLED") return;
    const period = subscriptionPeriod(subscription.startsAt, effectiveAt, subscription.plan.interval);
    const result = prorate({ unitAmountPaise: subscription.unitPricePaise, qtyDelta: -subscription.qty, effectiveDate: effectiveAt, periodStart: period.periodStart, periodEnd: period.periodEnd, prorateChanges: subscription.plan.creditOnCancel });
    await tx.subscription.update({ where: { id: subscription.id }, data: { status: "CANCELLED" } });
    await skipScheduledPeriods(tx, subscription.id, effectiveAt);
    if (result.amountPaise < 0) {
      const credit = await applySubscriptionCredit(tx, { orderId: subscription.orderId, orderLineId: subscription.orderLineId, amountPaise: Math.abs(grossPaise(result.amountPaise, subscription.orderLine.product.taxBps)), reason: result.reason });
      await logEvent(tx, { entity: "CREDIT_NOTE", entityId: credit.id, quoteId: subscription.order.quoteId, action: "CREDIT_NOTE_ISSUED", actorId: session.userId, reason: result.reason });
    }
    await logEvent(tx, { entity: "SUBSCRIPTION", entityId: subscription.id, quoteId: subscription.order.quoteId, action: "SUBSCRIPTION_CANCELLED", actorId: session.userId, reason: result.reason, meta: { proration: result } });
  }, { isolationLevel: "Serializable" });
  revalidatePath(`/app/billing/${orderCode}`);
  revalidatePath("/app/invoices");
}

export async function pauseSubscription(formData: FormData) {
  const session = await requireRole(["FINANCE", "ADMIN"]);
  const subscriptionId = Number(formData.get("subscriptionId"));
  const orderCode = String(formData.get("orderCode") ?? "");
  await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUniqueOrThrow({ where: { id: subscriptionId }, include: { plan: true, order: true } });
    if (subscription.status !== "ACTIVE") throw new Error("Only active subscriptions can be paused.");
    const pausedAt = new Date();
    const next = calendarPeriod(pausedAt, subscription.plan.interval);
    await skipScheduledPeriods(tx, subscription.id, pausedAt);
    await tx.subscription.update({ where: { id: subscription.id }, data: { status: "PAUSED", pausedAt, nextBillingAt: next.nextBillingAt } });
    await logEvent(tx, { entity: "SUBSCRIPTION", entityId: subscription.id, quoteId: subscription.order.quoteId, action: "SUBSCRIPTION_PAUSED", actorId: session.userId, reason: `Paused; billing resumes from ${next.nextBillingAt.toISOString().slice(0, 10)}.` });
  }, { isolationLevel: "Serializable" });
  revalidatePath(`/app/billing/${orderCode}`);
  revalidatePath("/app/billing");
}

export async function resumeSubscription(formData: FormData) {
  const session = await requireRole(["FINANCE", "ADMIN"]);
  const subscriptionId = Number(formData.get("subscriptionId"));
  const orderCode = String(formData.get("orderCode") ?? "");
  await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUniqueOrThrow({ where: { id: subscriptionId }, include: { plan: true, order: true, orderLine: { include: { product: true } } } });
    if (subscription.status !== "PAUSED") throw new Error("Only paused subscriptions can be resumed.");
    const resumed = await tx.subscription.update({ where: { id: subscription.id }, data: { status: "ACTIVE", pausedAt: null } });
    await ensureUpcomingPeriods(tx, { ...resumed, plan: subscription.plan }, subscription.orderLine.product.taxBps);
    const next = await tx.billingPeriod.findFirst({ where: { subscriptionId: subscription.id, status: "SCHEDULED" }, orderBy: { periodStart: "asc" } });
    if (next) await tx.subscription.update({ where: { id: subscription.id }, data: { nextBillingAt: next.periodStart } });
    await logEvent(tx, { entity: "SUBSCRIPTION", entityId: subscription.id, quoteId: subscription.order.quoteId, action: "SUBSCRIPTION_RESUMED", actorId: session.userId, reason: "Subscription resumed; upcoming scheduled periods restored." });
  }, { isolationLevel: "Serializable" });
  revalidatePath(`/app/billing/${orderCode}`);
  revalidatePath("/app/billing");
}

export async function runBillingAsOf(formData: FormData) {
  const session = await requireRole(["FINANCE", "ADMIN"]);
  const asOf = parseDateInput(formData.get("asOf"));
  const result = await prisma.$transaction(async (tx) => {
    const subscriptions = await tx.subscription.findMany({ where: { status: "ACTIVE", nextBillingAt: { lte: asOf } }, include: { plan: true, order: true, orderLine: { include: { product: true } }, billingPeriods: { orderBy: { periodStart: "asc" } } } });
    let generated = 0; let skipped = 0;
    const touchedOrders = new Set<number>();
    for (const subscription of subscriptions) {
      const taxBps = subscription.orderLine.product.taxBps;
      await ensureUpcomingPeriods(tx, subscription, taxBps);
      const scheduled = await tx.billingPeriod.findMany({ where: { subscriptionId: subscription.id, status: "SCHEDULED", periodStart: { lte: asOf } }, orderBy: { periodStart: "asc" } });
      const periods = scheduled.length
        ? scheduled.map((row) => ({ ...calendarPeriod(row.periodStart, subscription.plan.interval), row }))
        : dueBillingPeriods(subscription.nextBillingAt, asOf, subscription.plan.interval).map((period) => ({ ...period, row: null }));
      for (const period of periods) {
        const existing = await tx.invoice.findFirst({ where: { orderId: subscription.orderId, kind: "RECURRING", periodStart: period.periodStart, lines: { some: { orderLineId: subscription.orderLineId } } } });
        if (existing) {
          skipped++;
          if (period.row) await tx.billingPeriod.update({ where: { id: period.row.id }, data: { status: "INVOICED", invoiceId: existing.id } });
        } else {
          const charge = periodCharge(subscription.qty, subscription.unitPricePaise, taxBps);
          const code = await nextInvoiceCode(tx);
          const invoice = await tx.invoice.create({ data: { code, orderId: subscription.orderId, kind: "RECURRING", periodStart: period.periodStart, periodEnd: period.periodEnd, totalPaise: charge.totalPaise, issuedAt: new Date(), dueAt: new Date(Date.now() + 15 * 86_400_000), lines: { create: { orderLineId: subscription.orderLineId, description: `${subscription.orderLine.product.name} · full ${subscription.plan.interval.toLowerCase()} period`, qty: subscription.qty, unitPaise: subscription.unitPricePaise, taxPaise: charge.taxPaise, totalPaise: charge.totalPaise } } } });
          generated++;
          if (period.row) await tx.billingPeriod.update({ where: { id: period.row.id }, data: { status: "INVOICED", invoiceId: invoice.id, qty: subscription.qty, amountPaise: charge.amountPaise, taxPaise: charge.taxPaise } });
          await logEvent(tx, { entity: "INVOICE", entityId: invoice.id, quoteId: subscription.order.quoteId, action: "INVOICE_ISSUED", actorId: session.userId, reason: `${code} generated from the billing schedule.` });
        }
        await tx.subscription.update({ where: { id: subscription.id }, data: { nextBillingAt: period.nextBillingAt } });
        touchedOrders.add(subscription.orderId);
      }
      await ensureUpcomingPeriods(tx, { ...subscription, nextBillingAt: periods.at(-1)?.nextBillingAt ?? subscription.nextBillingAt }, taxBps);
      const nextScheduled = await tx.billingPeriod.findFirst({ where: { subscriptionId: subscription.id, status: "SCHEDULED" }, orderBy: { periodStart: "asc" } });
      if (!periods.length && nextScheduled) await tx.subscription.update({ where: { id: subscription.id }, data: { nextBillingAt: nextScheduled.periodStart } });
    }
    for (const orderId of touchedOrders) await refreshQuotePaymentStatus(tx, orderId);
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
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { order: true, creditNotes: { select: { amountPaise: true } } } });
    const remaining = invoiceRemainingPaise(invoice);
    if (amountPaise > remaining && remaining > 0) throw new Error("Credit exceeds the unpaid balance.");
    const credit = await applyInvoiceCredit(tx, invoice.id, amountPaise, reason);
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
