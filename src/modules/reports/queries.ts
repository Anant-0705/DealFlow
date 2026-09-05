import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveStage } from "@/modules/quotes/stages";
import { reportDateRange, type ReportFilters } from "./filters";

export type ReportRow = {
  code: string;
  date: Date;
  customer: string;
  tier: string;
  rep: string;
  stage: string;
  lines: number;
  subtotalPaise: number;
  discountPaise: number;
  discountBps: number;
  totalPaise: number;
  marginPaise: number;
  marginBps: number;
  approvalLevel: string;
  daysToApproval: number | null;
};

function approvalWhere(status: ReportFilters["approvalStatus"]): Prisma.QuoteWhereInput {
  if (status === "all") return {};
  if (status === "auto") return { auditEvents: { some: { action: "AUTO_APPROVED" } } };
  if (status === "returned") return { revisions: { some: { approvalSteps: { some: { status: "RETURNED" } } } } };
  return { approvalStatus: status.toUpperCase() as "PENDING" | "APPROVED" | "REJECTED" };
}

export async function getReportOptions() {
  const [reps, categories, products] = await Promise.all([
    prisma.user.findMany({ where: { role: "REP" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { active: true }, select: { id: true, name: true, categoryId: true }, orderBy: { name: "asc" } }),
  ]);
  return { reps, categories, products };
}

export async function getReportData(session: AppSession, filters: ReportFilters) {
  const range = reportDateRange(filters);
  const lineFilter: Prisma.QuoteLineWhereInput = {
    ...(filters.categoryId ? { product: { categoryId: filters.categoryId } } : {}),
    ...(filters.productId ? { productId: filters.productId } : {}),
  };
  const where: Prisma.QuoteWhereInput = {
    ...(session.role === "REP" ? { ownerId: session.userId } : filters.repId ? { ownerId: filters.repId } : {}),
    ...(filters.mode === "orders" ? { orders: { some: { confirmedAt: { gte: range.start, lte: range.end } } } } : { createdAt: { gte: range.start, lte: range.end } }),
    ...approvalWhere(filters.approvalStatus),
    ...((filters.categoryId || filters.productId) ? { currentRevision: { is: { lines: { some: lineFilter } } } } : {}),
  };
  const quotes = await prisma.quote.findMany({
    where,
    include: {
      customer: true,
      owner: true,
      currentRevision: { include: { lines: true } },
      orders: { orderBy: { confirmedAt: "desc" }, take: 1 },
      auditEvents: { where: { action: { in: ["SUBMITTED", "APPROVED", "AUTO_APPROVED"] } }, orderBy: { at: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  const rows: ReportRow[] = quotes.flatMap((quote) => {
    if (!quote.currentRevision) return [];
    const submitted = quote.auditEvents.find((event) => event.action === "SUBMITTED")?.at;
    const approved = quote.auditEvents.find((event) => ["APPROVED", "AUTO_APPROVED"].includes(event.action) && (!submitted || event.at >= submitted))?.at;
    return [{
      code: quote.code,
      date: filters.mode === "orders" ? quote.orders[0]?.confirmedAt ?? quote.createdAt : quote.createdAt,
      customer: quote.customer.name,
      tier: quote.customer.tier,
      rep: quote.owner.name,
      stage: deriveStage(quote),
      lines: quote.currentRevision.lines.length,
      subtotalPaise: quote.currentRevision.subtotalPaise,
      discountPaise: quote.currentRevision.discountPaise,
      discountBps: quote.currentRevision.subtotalPaise ? Math.round(quote.currentRevision.discountPaise * 10_000 / quote.currentRevision.subtotalPaise) : 0,
      totalPaise: quote.currentRevision.totalPaise,
      marginPaise: quote.currentRevision.marginPaise,
      marginBps: quote.currentRevision.marginBps,
      approvalLevel: quote.currentRevision.requiredLevel,
      daysToApproval: submitted && approved ? Number(((approved.getTime() - submitted.getTime()) / 86_400_000).toFixed(1)) : null,
    }];
  }).toSorted((a, b) => b.date.getTime() - a.date.getTime());

  const quoteIds = quotes.map((quote) => quote.id);
  let averageApprovalHours: number | null = null;
  let topUpsoldProduct = "No upsells in this period";
  if (quoteIds.length) {
    const [approvalResult, upsellResult] = await Promise.all([
      prisma.$queryRaw<Array<{ average_hours: number | null }>>(Prisma.sql`
        SELECT AVG(EXTRACT(EPOCH FROM (approved."at" - submitted."at")) / 3600)::float8 AS average_hours
        FROM "AuditEvent" submitted
        JOIN LATERAL (
          SELECT candidate."at" FROM "AuditEvent" candidate
          WHERE candidate."quoteId" = submitted."quoteId"
            AND candidate."action" IN ('APPROVED', 'AUTO_APPROVED')
            AND candidate."at" >= submitted."at"
          ORDER BY candidate."at" ASC LIMIT 1
        ) approved ON true
        WHERE submitted."action" = 'SUBMITTED' AND submitted."quoteId" IN (${Prisma.join(quoteIds)})
      `),
      prisma.$queryRaw<Array<{ product_id: number; uses: bigint }>>(Prisma.sql`
        SELECT ("meta"->>'productId')::int AS product_id, COUNT(*)::bigint AS uses
        FROM "AuditEvent"
        WHERE "action" = 'UPSELL_ADDED' AND "quoteId" IN (${Prisma.join(quoteIds)}) AND "meta"->>'productId' IS NOT NULL
        GROUP BY product_id ORDER BY uses DESC LIMIT 1
      `),
    ]);
    averageApprovalHours = approvalResult[0]?.average_hours ?? null;
    if (upsellResult[0]) {
      const product = await prisma.product.findUnique({ where: { id: upsellResult[0].product_id }, select: { name: true } });
      if (product) topUpsoldProduct = `${product.name} (${Number(upsellResult[0].uses)} adds)`;
    }
  }

  const subtotalPaise = rows.reduce((sum, row) => sum + row.subtotalPaise, 0);
  const discountPaise = rows.reduce((sum, row) => sum + row.discountPaise, 0);
  return {
    rows: rows.slice(0, 50),
    totals: {
      count: rows.length,
      totalPaise: rows.reduce((sum, row) => sum + row.totalPaise, 0),
      marginPaise: rows.reduce((sum, row) => sum + row.marginPaise, 0),
      weightedDiscountBps: subtotalPaise ? Math.round(discountPaise * 10_000 / subtotalPaise) : 0,
    },
    aggregates: { quotesCreated: rows.length, averageApprovalHours, topUpsoldProduct },
  };
}
