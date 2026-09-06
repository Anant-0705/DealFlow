import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type CodeDb = PrismaClient | Prisma.TransactionClient;

export async function nextCustomerCode(db: CodeDb) {
  const last = await db.customer.findFirst({ orderBy: { id: "desc" }, select: { code: true } });
  const numeric = last ? Number(last.code.replace(/\D/g, "")) : 1003;
  return `C-${Math.max(1004, Number.isFinite(numeric) ? numeric + 1 : 1004)}`;
}

export async function nextQuoteCode(db: CodeDb) {
  const last = await db.quote.findFirst({ orderBy: { id: "desc" }, select: { code: true } });
  const numeric = last ? Number(last.code.replace(/\D/g, "")) : 1041;
  return `Q-${Math.max(1042, numeric + 1)}`;
}

export async function nextCustomerCode(db: CodeDb) {
  const last = await db.customer.findFirst({ orderBy: { id: "desc" }, select: { code: true } });
  return nextCode(last?.code, "C", 1001);
}

async function nextCode(current: string | undefined, prefix: string, floor: number) {
  const numeric = current ? Number(current.replace(/\D/g, "")) : floor - 1;
  return `${prefix}-${Math.max(floor, numeric + 1)}`;
}

export async function nextOrderCode(db: CodeDb) {
  const last = await db.order.findFirst({ orderBy: { id: "desc" }, select: { code: true } });
  return nextCode(last?.code, "SO", 1042);
}

export async function nextInvoiceCode(db: CodeDb) {
  const last = await db.invoice.findFirst({ orderBy: { id: "desc" }, select: { code: true } });
  return nextCode(last?.code, "INV", 1042);
}

export async function nextCreditNoteCode(db: CodeDb) {
  const last = await db.creditNote.findFirst({ orderBy: { id: "desc" }, select: { code: true } });
  return nextCode(last?.code, "CN", 1001);
}
