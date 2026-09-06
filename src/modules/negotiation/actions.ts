"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { evaluateRevision } from "@/modules/pricing/engine";
import { confirmQuotation } from "./confirm";
import { confirmOnBehalfSchema, confirmSchema, counterSchema, messageSchema, unauthorizedConfirmSchema } from "./schemas";
import { getDocumentParties } from "@/modules/company/queries";
import { sendMail } from "@/modules/mail/send";
import { onBehalfConfirmedEmail, unauthorizedConfirmCustomerEmail, unauthorizedConfirmReviewerEmail } from "@/modules/mail/templates";
import { appBaseUrl } from "@/modules/customers/links";
import { formatMoney } from "@/lib/money";
import { CHANNEL_LABELS, disputePortalMessage, disputeTaskMessage, parseOnBehalfMeta } from "./on-behalf";
import { listConfirmationReviewers } from "./trust";

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
  revalidatePath("/portal/messages");
}

export async function proposeCounter(formData: FormData) {
  const session = await requireRole(["CUSTOMER"]);
  const selectedLineIds = String(formData.get("selectedLineIds") ?? "")
    .split(",")
    .map((lineId) => lineId.trim())
    .filter(Boolean)
    .map(Number);
  const value = counterSchema.parse({
    quoteCode: formData.get("quoteCode"),
    requests: selectedLineIds.map((lineId) => {
      const rawPercent = formData.get(`discount-${lineId}`);
      return {
        lineId,
        proposedDiscountBps: rawPercent === null || String(rawPercent).trim() === ""
          ? Number.NaN
          : Math.round(Number(rawPercent) * 100),
      };
    }),
    text: String(formData.get("text") ?? ""),
  });

  const result = await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findFirst({
      where: { code: value.quoteCode, customerId: session.customerId ?? -1, customerStatus: { in: ["SENT", "NEGOTIATING"] } },
      include: { customer: true, currentRevision: { include: { lines: { include: { product: { include: { category: true } } } } } } },
    });
    if (!quote?.currentRevision) throw new Error("Quotation not found.");
    const quoteLineIds = new Set(quote.currentRevision.lines.map((line) => line.id));
    if (value.requests.some((request) => !quoteLineIds.has(request.lineId))) throw new Error("Quotation line not found.");
    const requestedByLineId = new Map(value.requests.map((request) => [request.lineId, request.proposedDiscountBps]));
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
      lineDiscountBps: requestedByLineId.get(line.id) ?? line.lineDiscountBps,
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
    const requestSummary = value.requests.map((request) => {
      const line = quote.currentRevision!.lines.find((candidate) => candidate.id === request.lineId)!;
      return `${line.description}: ${request.proposedDiscountBps / 100}%`;
    }).join(", ");
    const messageText = value.text
      ? `${value.text}\nRequested discounts: ${requestSummary}.`
      : `Customer requested discounts: ${requestSummary}.`;
    const message = await tx.portalMessage.create({ data: {
      quoteId: quote.id,
      revisionId: revision.id,
      customerUserId: session.userId,
      message: messageText,
      proposedDiscountBps: value.requests.length === 1 ? value.requests[0].proposedDiscountBps : null,
    } });
    await logEvent(tx, { entity: "REVISION", entityId: revision.id, quoteId: quote.id, action: "REVISED", actorId: session.userId, reason: `Customer created v${revision.version} from v${quote.currentRevision.version}.`, meta: { fromVersion: quote.currentRevision.version, toVersion: revision.version, via: "PORTAL" } });
    await logEvent(tx, { entity: "PORTAL_MESSAGE", entityId: message.id, quoteId: quote.id, action: "COUNTER_PROPOSED", actorId: session.userId, reason: messageText, meta: { requests: value.requests } });
    await logEvent(tx, { entity: "REVISION", entityId: revision.id, quoteId: quote.id, action: evaluation.requiredLevel === "NONE" ? "AUTO_APPROVED" : "SUBMITTED", actorId: session.userId, reason: evaluation.reasons.join(" ") || "Counter-offer remains within policy.", meta: { reasons: evaluation.reasons } });
    return revision.version;
  }, { isolationLevel: "Serializable" });
  revalidatePath(`/portal/quotes/${value.quoteCode}`);
  revalidatePath("/portal");
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
    await tx.quote.update({ where: { id: quote.id }, data: { currentRevisionId: revision.id, approvalStatus: "NONE", customerStatus: "NEGOTIATING", lastActivityAt: new Date() } });
    await logEvent(tx, { entity: "REVISION", entityId: revision.id, quoteId: quote.id, action: "REVISED", actorId: session.userId, reason: `Reply created editable v${revision.version}.`, meta: { fromVersion: quote.currentRevision!.version, toVersion: revision.version } });
    await logEvent(tx, { entity: "PORTAL_MESSAGE", entityId: message.id, quoteId: quote.id, action: "PORTAL_MESSAGE", actorId: session.userId, reason: value.text });
  });
  revalidatePath("/app/quotations");
  revalidatePath(`/app/quotations/${value.quoteCode}`);
  revalidatePath("/app/approvals");
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
  const quoteCode = String(formData.get("quoteCode") ?? "");
  const parsed = confirmOnBehalfSchema.safeParse({
    quoteCode: formData.get("quoteCode"),
    revisionId: formData.get("revisionId"),
    channel: formData.get("channel"),
    note: formData.get("note"),
    authorized: formData.get("authorized"),
  });
  if (!parsed.success) {
    redirect(`/app/quotations/${quoteCode}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Record how the customer authorized this quotation.")}`);
  }
  const value = parsed.data;
  if (session.role === "REP") {
    const quote = await prisma.quote.findUnique({ where: { code: value.quoteCode }, select: { ownerId: true } });
    if (!quote || quote.ownerId !== session.userId) throw new Error("Only the quote owner can confirm it on behalf of the customer.");
  }
  const result = await confirmQuotation(value.quoteCode, value.revisionId, {
    userId: session.userId,
    role: session.role,
    customerId: null,
    onBehalf: true,
    evidence: { channel: value.channel, note: value.note },
  });
  if (!result.ok) redirect(`/app/quotations/${value.quoteCode}?error=${encodeURIComponent(result.message)}`);
  if (result.customerEmail) {
    await sendMail({
      to: result.customerEmail,
      ...onBehalfConfirmedEmail({
        customerName: result.customerName,
        quoteCode: result.quoteCode,
        version: result.version,
        totalLabel: formatMoney(result.totalPaise),
        actorName: result.actorName,
        channelLabel: CHANNEL_LABELS[value.channel],
        note: value.note,
        portalUrl: `${appBaseUrl()}/portal/quotes/${result.quoteCode}`,
      }),
    });
  }
  revalidatePath(`/app/quotations/${value.quoteCode}`);
  revalidatePath(`/portal/quotes/${value.quoteCode}`);
  redirect(`/app/fulfillment/${result.orderCode}?notice=${encodeURIComponent("Order created. The customer was notified in the portal.")}`);
}

export async function reportUnauthorizedConfirm(formData: FormData) {
  const session = await requireRole(["CUSTOMER"]);
  const quoteCode = String(formData.get("quoteCode") ?? "");
  const parsed = unauthorizedConfirmSchema.safeParse({ quoteCode: formData.get("quoteCode"), note: formData.get("note") });
  if (!parsed.success) {
    redirect(`/portal/quotes/${quoteCode}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Tell us what happened.")}`);
  }
  const value = parsed.data;
  const mailed = await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findFirst({
      where: { code: value.quoteCode, customerId: session.customerId ?? -1 },
      include: { customer: true, currentRevision: true, orders: { select: { code: true }, orderBy: { confirmedAt: "desc" }, take: 1 } },
    });
    if (!quote?.currentRevision) throw new Error("Quotation not found.");
    if (quote.customerStatus !== "CONFIRMED") throw new Error("This quotation is not confirmed.");
    const confirmed = await tx.auditEvent.findFirst({ where: { quoteId: quote.id, action: "CONFIRMED" }, orderBy: { at: "desc" } });
    const evidence = confirmed ? parseOnBehalfMeta(confirmed.meta) : { onBehalf: false };
    if (!evidence.onBehalf) throw new Error("Only a confirmation made on your behalf can be reported this way.");
    const existing = await tx.task.findFirst({ where: { quoteId: quote.id, kind: "CONFIRMATION_DISPUTE" }, select: { id: true } });
    if (existing) throw new Error("This confirmation has already been reported.");
    const reviewers = await listConfirmationReviewers(tx);
    const taskMessage = disputeTaskMessage({ customerName: quote.customer.name, quoteCode: quote.code, note: value.note });
    for (const reviewer of reviewers) {
      await tx.task.create({ data: { quoteId: quote.id, assigneeId: reviewer.id, createdById: session.userId, kind: "CONFIRMATION_DISPUTE", message: taskMessage } });
    }
    const message = await tx.portalMessage.create({
      data: { quoteId: quote.id, revisionId: quote.currentRevision.id, customerUserId: session.userId, message: disputePortalMessage(value.note) },
    });
    await tx.quote.update({ where: { id: quote.id }, data: { lastActivityAt: new Date() } });
    await logEvent(tx, {
      entity: "QUOTE",
      entityId: quote.id,
      quoteId: quote.id,
      action: "CONFIRMATION_DISPUTED",
      actorId: session.userId,
      reason: value.note,
      meta: { onBehalf: true, orderCode: quote.orders[0]?.code ?? null },
    });
    await logEvent(tx, { entity: "PORTAL_MESSAGE", entityId: message.id, quoteId: quote.id, action: "PORTAL_MESSAGE", actorId: session.userId, reason: message.message });
    return {
      customerName: quote.customer.name,
      customerEmail: quote.customer.email,
      quoteCode: quote.code,
      orderCode: quote.orders[0]?.code ?? null,
      reviewers,
      note: value.note,
    };
  });
  const portalUrl = `${appBaseUrl()}/portal/quotes/${mailed.quoteCode}`;
  const quoteUrl = `${appBaseUrl()}/app/quotations/${mailed.quoteCode}`;
  if (mailed.customerEmail) {
    await sendMail({ to: mailed.customerEmail, ...unauthorizedConfirmCustomerEmail({ customerName: mailed.customerName, quoteCode: mailed.quoteCode, portalUrl }) });
  }
  await Promise.all(mailed.reviewers.map((reviewer) => sendMail({
    to: reviewer.email,
    ...unauthorizedConfirmReviewerEmail({
      reviewerName: reviewer.name,
      customerName: mailed.customerName,
      quoteCode: mailed.quoteCode,
      note: mailed.note,
      quoteUrl,
    }),
  })));
  revalidatePath(`/portal/quotes/${mailed.quoteCode}`);
  revalidatePath(`/app/quotations/${mailed.quoteCode}`);
  revalidatePath("/app/deal-health");
  revalidatePath("/app/dashboard");
  if (mailed.orderCode) revalidatePath(`/app/fulfillment/${mailed.orderCode}`);
  redirect(`/portal/quotes/${mailed.quoteCode}?notice=${encodeURIComponent("We received your report. A manager and finance will review it before anything is reserved or shipped.")}`);
}
