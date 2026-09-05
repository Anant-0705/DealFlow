"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { evaluateRevision } from "@/modules/pricing/engine";
import { confirmQuotation } from "./confirm";
import { confirmSchema, counterSchema, messageSchema } from "./schemas";
import { getDocumentParties } from "@/modules/company/queries";

const nullableNumber = (value: FormDataEntryValue | null) => value ? Number(value) : null;

export async function sendToCustomer(formData: FormData) {
  const session = await requireRole(["REP", "MANAGER", "ADMIN"]);
  const quoteCode = String(formData.get("quoteCode") ?? "");
  const quote = await prisma.quote.findUniqueOrThrow({ where: { code: quoteCode }, include: { currentRevision: true, customer: true } });
  if (!quote.currentRevision || quote.approvalStatus !== "APPROVED") throw new Error("This quotation must be approved before it can be sent.");
  if (quote.customerStatus === "CONFIRMED") throw new Error("A confirmed quotation cannot be sent again.");
  if (session.role === "REP" && quote.ownerId !== session.userId) throw new Error("Only the quote owner can send it.");
  const documents = await getDocumentParties(quote.customerId);
  if (!documents.ready) redirect(`/app/quotations/${quoteCode}?error=${encodeURIComponent(documents.message)}`);
  await prisma.$transaction(async (tx) => {
    await tx.quote.update({ where: { id: quote.id }, data: { customerStatus: "SENT", lastActivityAt: new Date() } });
    await logEvent(tx, { entity: "QUOTE", entityId: quote.id, quoteId: quote.id, action: "SENT", actorId: session.userId, reason: `${quote.code} v${quote.currentRevision!.version} sent to customer.` });
  });
  revalidatePath(`/app/quotations/${quoteCode}`);
}

export async function postMessage(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");
  const value = messageSchema.parse({ quoteCode: formData.get("quoteCode"), lineId: nullableNumber(formData.get("lineId")), text: formData.get("text") });
  const quote = await prisma.quote.findFirst({ where: { code: value.quoteCode, ...(session.role === "CUSTOMER" ? { customerId: session.customerId ?? -1 } : {}) } });
  if (!quote) throw new Error("Quotation not found.");
  if (session.role !== "CUSTOMER" && !["REP", "MANAGER", "ADMIN"].includes(session.role)) throw new Error("You do not have permission to reply.");
  if (value.lineId) {
    const line = await prisma.quoteLine.findFirst({ where: { id: value.lineId, revisionId: quote.currentRevisionId! } });
    if (!line) throw new Error("Quotation line not found.");
  }
  await prisma.$transaction(async (tx) => {
    const message = await tx.portalMessage.create({ data: { quoteId: quote.id, revisionId: quote.currentRevisionId!, customerUserId: session.userId, lineId: value.lineId ?? null, message: value.text } });
    await tx.quote.update({ where: { id: quote.id }, data: { customerStatus: quote.customerStatus === "SENT" ? "NEGOTIATING" : quote.customerStatus, lastActivityAt: new Date() } });
    await logEvent(tx, { entity: "PORTAL_MESSAGE", entityId: message.id, quoteId: quote.id, action: "PORTAL_MESSAGE", actorId: session.userId, reason: value.text, meta: { lineId: value.lineId ?? null } });
  });
  revalidatePath(`/portal/quotes/${value.quoteCode}`);
  revalidatePath(`/app/quotations/${value.quoteCode}`);
}

export async function proposeCounter(formData: FormData) {
  const session = await requireRole(["CUSTOMER"]);
  const value = counterSchema.parse({
    quoteCode: formData.get("quoteCode"),
    lineId: nullableNumber(formData.get("lineId")),
    proposedDiscountBps: Math.round(Number(formData.get("proposedPercent")) * 100),
    text: String(formData.get("text") ?? ""),
  });

  const result = await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findFirst({
      where: { code: value.quoteCode, customerId: session.customerId ?? -1, customerStatus: { in: ["SENT", "NEGOTIATING"] } },
      include: { customer: true, currentRevision: { include: { lines: { include: { product: { include: { category: true } } } } } } },
    });
    if (!quote?.currentRevision) throw new Error("Quotation not found.");
    if (value.lineId && !quote.currentRevision.lines.some((line) => line.id === value.lineId)) throw new Error("Quotation line not found.");
    const policy = await tx.discountPolicy.findUniqueOrThrow({ where: { id: 1 } });
    const proposed = quote.currentRevision.lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      description: line.description,
      categoryId: line.product.categoryId,
      categoryName: line.product.category.name,
      categoryCeilingBps: line.product.category.discountCeilingBps,
      qty: line.qty,
      unitPricePaise: line.unitPricePaise,
      unitCostPaise: line.unitCostPaise,
      taxBps: line.product.taxBps,
      lineDiscountBps: !value.lineId || line.id === value.lineId ? value.proposedDiscountBps : line.lineDiscountBps,
    }));
    const evaluation = evaluateRevision({ customerTier: quote.customer.tier, policy, orderDiscountBps: quote.currentRevision.orderDiscountBps, lines: proposed });
    await tx.approvalStep.updateMany({ where: { revisionId: quote.currentRevision.id }, data: { status: "STALE" } });
    const revision = await tx.quoteRevision.create({ data: {
      quoteId: quote.id,
      version: quote.currentRevision.version + 1,
      orderDiscountBps: quote.currentRevision.orderDiscountBps,
      subtotalPaise: evaluation.subtotalPaise,
      discountPaise: evaluation.discountPaise,
      taxPaise: evaluation.taxPaise,
      totalPaise: evaluation.totalPaise,
      costPaise: evaluation.costPaise,
      marginPaise: evaluation.marginPaise,
      marginBps: evaluation.marginBps,
      maxLineExcessBps: evaluation.maxLineExcessBps,
      blendedExcessBps: evaluation.blendedExcessBps,
      excessValuePaise: evaluation.excessValuePaise,
      requiredLevel: evaluation.requiredLevel,
      reasons: evaluation.reasons,
      createdById: session.userId,
      createdVia: "PORTAL",
      submittedAt: new Date(),
      lines: { create: proposed.map((line, index) => ({
        productId: line.productId,
        variantId: line.variantId,
        description: line.description,
        qty: line.qty,
        unitPricePaise: line.unitPricePaise,
        unitCostPaise: line.unitCostPaise,
        lineDiscountBps: line.lineDiscountBps,
        effectiveDiscountBps: evaluation.lines[index].effectiveDiscountBps,
        allowedDiscountBps: evaluation.lines[index].allowedDiscountBps,
        excessBps: evaluation.lines[index].excessBps,
        netPaise: evaluation.lines[index].netPaise,
        taxPaise: evaluation.lines[index].taxPaise,
      })) },
    } });
    if (evaluation.requiredLevel !== "NONE") {
      await tx.approvalStep.create({ data: { revisionId: revision.id, level: "MANAGER", sequence: 1 } });
      if (evaluation.requiredLevel === "FINANCE") await tx.approvalStep.create({ data: { revisionId: revision.id, level: "FINANCE", sequence: 2 } });
    }
    await tx.quote.update({ where: { id: quote.id }, data: { currentRevisionId: revision.id, approvalStatus: evaluation.requiredLevel === "NONE" ? "APPROVED" : "PENDING", customerStatus: "NEGOTIATING", lastActivityAt: new Date() } });
    const messageText = value.text || `Customer proposed ${value.proposedDiscountBps / 100}% discount${value.lineId ? " on one line" : " on all lines"}.`;
    const message = await tx.portalMessage.create({ data: { quoteId: quote.id, revisionId: revision.id, customerUserId: session.userId, message: messageText, proposedDiscountBps: value.proposedDiscountBps } });
    await logEvent(tx, { entity: "REVISION", entityId: revision.id, quoteId: quote.id, action: "REVISED", actorId: session.userId, reason: `Customer created v${revision.version} from v${quote.currentRevision.version}.`, meta: { fromVersion: quote.currentRevision.version, toVersion: revision.version, via: "PORTAL" } });
    await logEvent(tx, { entity: "PORTAL_MESSAGE", entityId: message.id, quoteId: quote.id, action: "COUNTER_PROPOSED", actorId: session.userId, reason: messageText, meta: { proposedDiscountBps: value.proposedDiscountBps, lineId: value.lineId ?? null } });
    await logEvent(tx, { entity: "REVISION", entityId: revision.id, quoteId: quote.id, action: evaluation.requiredLevel === "NONE" ? "AUTO_APPROVED" : "SUBMITTED", actorId: session.userId, reason: evaluation.reasons.join(" ") || "Counter-offer remains within policy.", meta: { reasons: evaluation.reasons } });
    return revision.version;
  }, { isolationLevel: "Serializable" });
  revalidatePath(`/portal/quotes/${value.quoteCode}`);
  revalidatePath("/app/approvals");
  redirect(`/portal/quotes/${value.quoteCode}?notice=Counter-offer+submitted+as+v${result}`);
}

export async function acceptCounter(formData: FormData) {
  const session = await requireRole(["REP", "ADMIN"]);
  const quoteCode = String(formData.get("quoteCode") ?? "");
  const quote = await prisma.quote.findUniqueOrThrow({ where: { code: quoteCode }, include: { currentRevision: true } });
  if (session.role === "REP" && quote.ownerId !== session.userId) throw new Error("Only the quote owner can accept it.");
  if (quote.currentRevision?.createdVia !== "PORTAL") throw new Error("The current revision is not a customer counter-offer.");
  await prisma.$transaction(async (tx) => logEvent(tx, { entity: "REVISION", entityId: quote.currentRevisionId!, quoteId: quote.id, action: "COUNTER_ACCEPTED", actorId: session.userId, reason: "Customer counter-offer accepted for the current revision." }));
  revalidatePath(`/app/quotations/${quoteCode}`);
}

export async function replyAndRevise(formData: FormData) {
  const session = await requireRole(["REP", "ADMIN"]);
  const value = messageSchema.parse({ quoteCode: formData.get("quoteCode"), text: formData.get("text"), lineId: null });
  const quote = await prisma.quote.findUniqueOrThrow({ where: { code: value.quoteCode }, include: { currentRevision: { include: { lines: true } } } });
  if (!quote.currentRevision) throw new Error("Quotation has no current revision.");
  if (session.role === "REP" && quote.ownerId !== session.userId) throw new Error("Only the quote owner can revise it.");
  await prisma.$transaction(async (tx) => {
    await tx.approvalStep.updateMany({ where: { revisionId: quote.currentRevision!.id }, data: { status: "STALE" } });
    const revision = await tx.quoteRevision.create({ data: {
      quoteId: quote.id,
      version: quote.currentRevision!.version + 1,
      orderDiscountBps: quote.currentRevision!.orderDiscountBps,
      subtotalPaise: quote.currentRevision!.subtotalPaise,
      discountPaise: quote.currentRevision!.discountPaise,
      taxPaise: quote.currentRevision!.taxPaise,
      totalPaise: quote.currentRevision!.totalPaise,
      costPaise: quote.currentRevision!.costPaise,
      marginPaise: quote.currentRevision!.marginPaise,
      marginBps: quote.currentRevision!.marginBps,
      maxLineExcessBps: quote.currentRevision!.maxLineExcessBps,
      blendedExcessBps: quote.currentRevision!.blendedExcessBps,
      excessValuePaise: quote.currentRevision!.excessValuePaise,
      requiredLevel: quote.currentRevision!.requiredLevel,
      reasons: JSON.parse(JSON.stringify(quote.currentRevision!.reasons)),
      createdById: session.userId,
      createdVia: "REP",
      lines: { create: quote.currentRevision!.lines.map((line) => ({ productId: line.productId, variantId: line.variantId, description: line.description, qty: line.qty, unitPricePaise: line.unitPricePaise, unitCostPaise: line.unitCostPaise, lineDiscountBps: line.lineDiscountBps, effectiveDiscountBps: line.effectiveDiscountBps, allowedDiscountBps: line.allowedDiscountBps, excessBps: line.excessBps, netPaise: line.netPaise, taxPaise: line.taxPaise })) },
    } });
    const message = await tx.portalMessage.create({ data: { quoteId: quote.id, revisionId: revision.id, customerUserId: session.userId, message: value.text } });
    await tx.quote.update({ where: { id: quote.id }, data: { currentRevisionId: revision.id, approvalStatus: "STALE", customerStatus: "NEGOTIATING", lastActivityAt: new Date() } });
    await logEvent(tx, { entity: "REVISION", entityId: revision.id, quoteId: quote.id, action: "REVISED", actorId: session.userId, reason: `Reply created editable v${revision.version}.`, meta: { fromVersion: quote.currentRevision!.version, toVersion: revision.version } });
    await logEvent(tx, { entity: "PORTAL_MESSAGE", entityId: message.id, quoteId: quote.id, action: "PORTAL_MESSAGE", actorId: session.userId, reason: value.text });
  });
  redirect(`/app/quotations/${value.quoteCode}?notice=Revision+created`);
}

export async function confirmAsCustomer(formData: FormData) {
  const session = await requireRole(["CUSTOMER"]);
  const value = confirmSchema.parse({ quoteCode: formData.get("quoteCode"), revisionId: formData.get("revisionId") });
  const result = await confirmQuotation(value.quoteCode, value.revisionId, { userId: session.userId, role: session.role, customerId: session.customerId });
  if (!result.ok) redirect(`/portal/quotes/${value.quoteCode}?error=${encodeURIComponent(result.message)}`);
  redirect(`/portal/quotes/${value.quoteCode}?notice=${encodeURIComponent(`Confirmed · ${result.orderCode}`)}`);
}

export async function confirmOnBehalf(formData: FormData) {
  const session = await requireRole(["REP", "MANAGER", "ADMIN"]);
  const value = confirmSchema.parse({ quoteCode: formData.get("quoteCode"), revisionId: formData.get("revisionId") });
  if (session.role === "REP") {
    const quote = await prisma.quote.findUnique({ where: { code: value.quoteCode }, select: { ownerId: true } });
    if (!quote || quote.ownerId !== session.userId) throw new Error("Only the quote owner can confirm it on behalf of the customer.");
  }
  const result = await confirmQuotation(value.quoteCode, value.revisionId, { userId: session.userId, role: session.role, customerId: null, onBehalf: true });
  if (!result.ok) redirect(`/app/quotations/${value.quoteCode}?error=${encodeURIComponent(result.message)}`);
  redirect(`/app/fulfillment/${result.orderCode}?notice=Order+created`);
}
