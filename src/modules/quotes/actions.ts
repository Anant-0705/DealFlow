"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { nextQuoteCode } from "@/lib/codes";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { evaluateRevision } from "@/modules/pricing/engine";
import { draftSchema, type DraftInput } from "./schemas";

const quoteEditorRoles = ["REP", "ADMIN"] as const;

async function resolveEvaluation(input: DraftInput) {
  const quote = await prisma.quote.findUniqueOrThrow({ where: { id: input.quoteId }, include: { customer: true, currentRevision: true } });
  const [policy, priceList, products] = await Promise.all([
    prisma.discountPolicy.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.priceList.findUniqueOrThrow({ where: { tier: quote.customer.tier } }),
    prisma.product.findMany({ where: { id: { in: input.lines.map((line) => line.productId) } }, include: { category: true, variants: true } }),
  ]);
  const map = new Map(products.map((product) => [product.id, product]));
  const trustedLines = input.lines.map((line) => {
    const product = map.get(line.productId);
    if (!product || !product.active) throw new Error("A selected product is unavailable.");
    const variant = line.variantId ? product.variants.find((item) => item.id === line.variantId) : null;
    if (line.variantId && !variant) throw new Error("The selected variant does not belong to this product.");
    const listPrice = product.listPricePaise + (variant?.extraPricePaise ?? 0);
    const unitPricePaise = Math.round(listPrice * (10_000 - (priceList.rule === "PERCENT_OFF" ? priceList.valueBps : 0)) / 10_000);
    return { key: `${product.id}:${variant?.id ?? "base"}`, description: product.name, categoryId: product.categoryId, categoryName: product.category.name, categoryCeilingBps: product.category.discountCeilingBps, qty: line.qty, unitPricePaise, unitCostPaise: product.costPaise, taxBps: product.taxBps, lineDiscountBps: line.lineDiscountBps, productId: product.id, variantId: variant?.id ?? null };
  });
  const evaluation = evaluateRevision({ customerTier: quote.customer.tier, policy, orderDiscountBps: input.orderDiscountBps, lines: trustedLines });
  return { quote, evaluation, trustedLines };
}

async function persistDraft(input: DraftInput, actorId: number, canOverrideOwner: boolean) {
  const { quote, evaluation, trustedLines } = await resolveEvaluation(input);
  if (!canOverrideOwner && quote.ownerId !== actorId) throw new Error("Only the quote owner can edit this quotation.");
  if (!quote.currentRevisionId) throw new Error("Quote has no active revision.");
  if (!["NONE", "STALE"].includes(quote.approvalStatus)) throw new Error("Create a revision before editing this submitted quote.");
  const before = await prisma.quoteLine.findMany({ where: { revisionId: quote.currentRevisionId } });
  await prisma.$transaction(async (tx) => {
    await tx.quoteLine.deleteMany({ where: { revisionId: quote.currentRevisionId! } });
    for (let index = 0; index < trustedLines.length; index++) {
      const source = trustedLines[index]; const line = evaluation.lines[index];
      await tx.quoteLine.create({ data: { revisionId: quote.currentRevisionId!, productId: source.productId, variantId: source.variantId, description: source.description, qty: source.qty, unitPricePaise: source.unitPricePaise, unitCostPaise: source.unitCostPaise, lineDiscountBps: source.lineDiscountBps, effectiveDiscountBps: line.effectiveDiscountBps, allowedDiscountBps: line.allowedDiscountBps, excessBps: line.excessBps, netPaise: line.netPaise, taxPaise: line.taxPaise } });
    }
    await tx.quoteRevision.update({ where: { id: quote.currentRevisionId! }, data: { orderDiscountBps: input.orderDiscountBps, subtotalPaise: evaluation.subtotalPaise, discountPaise: evaluation.discountPaise, taxPaise: evaluation.taxPaise, totalPaise: evaluation.totalPaise, costPaise: evaluation.costPaise, marginPaise: evaluation.marginPaise, marginBps: evaluation.marginBps, maxLineExcessBps: evaluation.maxLineExcessBps, blendedExcessBps: evaluation.blendedExcessBps, excessValuePaise: evaluation.excessValuePaise, requiredLevel: evaluation.requiredLevel, reasons: evaluation.reasons } });
    await tx.quote.update({ where: { id: quote.id }, data: { lastActivityAt: new Date() } });
    const key = (line: { productId: number; variantId?: number | null }) => `${line.productId}:${line.variantId ?? "base"}`;
    const beforeMap = new Map(before.map((line) => [key(line), line]));
    const afterMap = new Map(input.lines.map((line) => [key(line), line]));
    for (const [lineKey, line] of afterMap) {
      const previous = beforeMap.get(lineKey);
      if (!previous) await logEvent(tx, { entity: "REVISION", entityId: quote.currentRevisionId!, quoteId: quote.id, action: "LINE_ADDED", actorId, reason: "Quote line added", meta: { after: line } });
      else if (previous.qty !== line.qty || previous.lineDiscountBps !== line.lineDiscountBps) await logEvent(tx, { entity: "REVISION", entityId: quote.currentRevisionId!, quoteId: quote.id, action: "LINE_UPDATED", actorId, reason: "Quote line updated", meta: { before: { qty: previous.qty, lineDiscountBps: previous.lineDiscountBps }, after: line } });
    }
    for (const [lineKey, line] of beforeMap) if (!afterMap.has(lineKey)) await logEvent(tx, { entity: "REVISION", entityId: quote.currentRevisionId!, quoteId: quote.id, action: "LINE_REMOVED", actorId, reason: "Quote line removed", meta: { before: { productId: line.productId, variantId: line.variantId, qty: line.qty, lineDiscountBps: line.lineDiscountBps } } });
    if (input.auditAction === "UPSELL_ADDED") await logEvent(tx, { entity: "REVISION", entityId: quote.currentRevisionId!, quoteId: quote.id, action: "UPSELL_ADDED", actorId, reason: "Accepted an upsell suggestion", meta: { productId: input.upsellProductId } });
    if (input.orderDiscountBps !== quote.currentRevision?.orderDiscountBps) await logEvent(tx, { entity: "REVISION", entityId: quote.currentRevisionId!, quoteId: quote.id, action: "ORDER_DISCOUNT_CHANGED", actorId, meta: { before: quote.currentRevision?.orderDiscountBps ?? 0, after: input.orderDiscountBps } });
  });
  return evaluation;
}

export async function createQuote(formData: FormData) {
  const session = await requireRole([...quoteEditorRoles]);
  const customerId = z.coerce.number().int().positive().parse(formData.get("customerId"));
  const code = await nextQuoteCode(prisma);
  const quote = await prisma.$transaction(async (tx) => {
    const created = await tx.quote.create({ data: { code, customerId, ownerId: session.userId } });
    const revision = await tx.quoteRevision.create({ data: { quoteId: created.id, version: 1, createdById: session.userId } });
    await tx.quote.update({ where: { id: created.id }, data: { currentRevisionId: revision.id } });
    await logEvent(tx, { entity: "QUOTE", entityId: created.id, quoteId: created.id, action: "QUOTE_CREATED", actorId: session.userId, reason: "New quotation created" });
    return created;
  });
  redirect(`/app/quotations/${quote.code}`);
}

export async function saveDraft(raw: unknown) {
  const session = await requireRole([...quoteEditorRoles]);
  const input = draftSchema.parse(raw);
  const evaluation = await persistDraft(input, session.userId, session.role === "ADMIN");
  revalidatePath(`/app/quotations`);
  return evaluation;
}

export async function submitForApproval(raw: unknown) {
  const session = await requireRole([...quoteEditorRoles]);
  const input = draftSchema.parse(raw);
  if (!input.lines.length) throw new Error("Add at least one product before submitting.");
  const evaluation = await persistDraft(input, session.userId, session.role === "ADMIN");
  const quote = await prisma.quote.findUniqueOrThrow({ where: { id: input.quoteId } });
  await prisma.$transaction(async (tx) => {
    await tx.approvalStep.deleteMany({ where: { revisionId: quote.currentRevisionId! } });
    if (evaluation.requiredLevel !== "NONE") {
      await tx.approvalStep.create({ data: { revisionId: quote.currentRevisionId!, level: "MANAGER", sequence: 1 } });
      if (evaluation.requiredLevel === "FINANCE") await tx.approvalStep.create({ data: { revisionId: quote.currentRevisionId!, level: "FINANCE", sequence: 2 } });
    }
    await tx.quoteRevision.update({ where: { id: quote.currentRevisionId! }, data: { submittedAt: new Date() } });
    await tx.quote.update({ where: { id: quote.id }, data: { approvalStatus: evaluation.requiredLevel === "NONE" ? "APPROVED" : "PENDING", lastActivityAt: new Date() } });
    await logEvent(tx, { entity: "REVISION", entityId: quote.currentRevisionId!, quoteId: quote.id, action: "SUBMITTED", actorId: session.userId, reason: evaluation.reasons.join(" "), meta: { reasons: evaluation.reasons } });
    if (evaluation.requiredLevel === "NONE") await logEvent(tx, { entity: "APPROVAL", entityId: quote.currentRevisionId!, quoteId: quote.id, action: "AUTO_APPROVED", actorId: session.userId, reason: "All lines are within policy." });
  });
  revalidatePath("/app");
  return { ok: true, requiredLevel: evaluation.requiredLevel };
}

export async function reviseQuote(quoteId: number) {
  const session = await requireRole([...quoteEditorRoles]);
  const id = z.number().int().positive().parse(quoteId);
  const quote = await prisma.quote.findUniqueOrThrow({ where: { id }, include: { currentRevision: { include: { lines: true } } } });
  if (session.role !== "ADMIN" && quote.ownerId !== session.userId) throw new Error("Only the quote owner can create a revision.");
  if (!quote.currentRevision) throw new Error("Quote has no revision.");
  const next = await prisma.$transaction(async (tx) => {
    await tx.approvalStep.updateMany({ where: { revisionId: quote.currentRevision!.id }, data: { status: "STALE" } });
    const revision = await tx.quoteRevision.create({ data: { quoteId: quote.id, version: quote.currentRevision!.version + 1, orderDiscountBps: quote.currentRevision!.orderDiscountBps, subtotalPaise: quote.currentRevision!.subtotalPaise, discountPaise: quote.currentRevision!.discountPaise, taxPaise: quote.currentRevision!.taxPaise, totalPaise: quote.currentRevision!.totalPaise, costPaise: quote.currentRevision!.costPaise, marginPaise: quote.currentRevision!.marginPaise, marginBps: quote.currentRevision!.marginBps, maxLineExcessBps: quote.currentRevision!.maxLineExcessBps, blendedExcessBps: quote.currentRevision!.blendedExcessBps, excessValuePaise: quote.currentRevision!.excessValuePaise, requiredLevel: quote.currentRevision!.requiredLevel, reasons: JSON.parse(JSON.stringify(quote.currentRevision!.reasons)), createdById: session.userId, lines: { create: quote.currentRevision!.lines.map((line) => ({ productId: line.productId, variantId: line.variantId, description: line.description, qty: line.qty, unitPricePaise: line.unitPricePaise, unitCostPaise: line.unitCostPaise, lineDiscountBps: line.lineDiscountBps, effectiveDiscountBps: line.effectiveDiscountBps, allowedDiscountBps: line.allowedDiscountBps, excessBps: line.excessBps, netPaise: line.netPaise, taxPaise: line.taxPaise })) } } });
    await tx.quote.update({ where: { id }, data: { currentRevisionId: revision.id, approvalStatus: "STALE", lastActivityAt: new Date() } });
    await logEvent(tx, { entity: "REVISION", entityId: revision.id, quoteId: id, action: "REVISED", actorId: session.userId, reason: `Created v${revision.version} from v${quote.currentRevision!.version}`, meta: { fromVersion: quote.currentRevision!.version, toVersion: revision.version } });
    return revision;
  });
  revalidatePath(`/app/quotations/${quote.code}`);
  return { ok: true, version: next.version };
}

export async function dismissUpsell(revisionId: number, productId: number) {
  const session = await requireRole([...quoteEditorRoles]);
  z.number().int().positive().parse(revisionId);
  z.number().int().positive().parse(productId);
  const revision = await prisma.quoteRevision.findUniqueOrThrow({ where: { id: revisionId }, include: { quote: true } });
  if (session.role !== "ADMIN" && revision.quote.ownerId !== session.userId) throw new Error("Only the quote owner can dismiss suggestions.");
  const current = Array.isArray(revision.dismissedUpsellIds) ? revision.dismissedUpsellIds.filter((id): id is number => typeof id === "number") : [];
  await prisma.$transaction(async (tx) => {
    await tx.quoteRevision.update({ where: { id: revisionId }, data: { dismissedUpsellIds: [...new Set([...current, productId])] } });
    await logEvent(tx, { entity: "REVISION", entityId: revisionId, quoteId: revision.quoteId, action: "UPSELL_DISMISSED", actorId: session.userId, reason: "Upsell suggestion dismissed", meta: { productId } });
  });
  revalidatePath("/app/quotations");
  return { ok: true };
}

export async function reloadWorkspace() {
  await requireRole(["REP", "MANAGER", "FINANCE", "ADMIN"]);
  revalidatePath("/app", "layout");
  return { ok: true };
}
