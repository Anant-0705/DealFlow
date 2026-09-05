import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/audit";
import { createOrderFromRevision } from "@/modules/orders/actions";
import { generateInitialBilling } from "@/modules/billing/onConfirm";
import { getDocumentParties } from "@/modules/company/queries";
import { allocateInventory } from "@/modules/inventory/allocate";
import { promisedDeliveryDate } from "@/modules/inventory/promise";

export type ConfirmActor = { userId: number; role: UserRole; customerId: number | null; onBehalf?: boolean };

export async function confirmQuotation(quoteCode: string, revisionId: number, actor: ConfirmActor) {
  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findFirst({
      where: { code: quoteCode, ...(actor.role === "CUSTOMER" ? { customerId: actor.customerId ?? -1 } : {}) },
      include: { currentRevision: { include: { approvalSteps: true, lines: { include: { product: { include: { category: true } }, variant: true } } } } },
    });
    if (!quote?.currentRevision) return { ok: false as const, code: "NOT_FOUND" as const, message: "Quotation not found." };
    if (revisionId !== quote.currentRevisionId) return { ok: false as const, code: "STALE" as const, message: `This quotation was updated (now v${quote.currentRevision.version}). Please review the latest version.` };
    if (quote.customerStatus === "CONFIRMED") return { ok: false as const, code: "CONFIRMED" as const, message: "Already confirmed." };
    const steps = quote.currentRevision.approvalSteps;
    const approvalsValid = quote.approvalStatus === "APPROVED" && steps.every((step) => step.status === "APPROVED");
    if (!approvalsValid) return { ok: false as const, code: "APPROVAL" as const, message: "Awaiting internal approval." };
    const documents = await getDocumentParties(quote.customerId);
    if (!documents.ready) return { ok: false as const, code: "DOCUMENTS" as const, message: documents.message };

    const confirmedAt = new Date();
    const [stock, warehouses, receipts] = await Promise.all([
      tx.stock.findMany({ select: { warehouseId: true, productId: true, variantId: true, onHand: true, reserved: true } }),
      tx.warehouse.findMany({ where: { active: true }, select: { id: true, name: true, shippingCostWeightPaise: true, replenishmentLeadDays: true } }),
      tx.stockReceipt.findMany({ where: { receivedAt: null }, select: { productId: true, variantId: true, qty: true, expectedAt: true, receivedAt: true } }),
    ]);
    const plan = allocateInventory(
      quote.currentRevision.lines.map((line) => ({
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
    const promised = quote.promisedDeliveryDate ?? promisedDeliveryDate({ confirmedAt, plan, warehouses, receipts });
    const order = await createOrderFromRevision(tx, { quoteId: quote.id, revisionId, confirmedAt, promisedDeliveryDate: promised });
    await tx.quote.update({ where: { id: quote.id }, data: { customerStatus: "CONFIRMED", fulfillmentStatus: "PLANNED", paymentStatus: "UNPAID", lastActivityAt: confirmedAt } });
    await logEvent(tx, { entity: "QUOTE", entityId: quote.id, quoteId: quote.id, action: "CONFIRMED", actorId: actor.userId, reason: actor.onBehalf ? "Confirmed on behalf of the customer." : "Customer confirmed the quotation.", meta: { revisionId, onBehalf: Boolean(actor.onBehalf) } });
    await logEvent(tx, { entity: "ORDER", entityId: order.id, quoteId: quote.id, action: "ORDER_CREATED", actorId: actor.userId, reason: `${order.code} created from ${quote.code} v${quote.currentRevision.version}.` });
    const billing = await generateInitialBilling(tx, { orderId: order.id, quoteId: quote.id, actorId: actor.userId, confirmedAt });
    return { ok: true as const, orderCode: order.code, ...billing };
  }, { isolationLevel: "Serializable" });
}
