import "server-only";

import type { AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDealHealth } from "@/modules/health/queries";
import { invoiceRemainingPaise } from "@/modules/billing/invoice-balance";

function startOfMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getDashboardData(session: AppSession) {
  const ownedQuote = session.role === "REP" ? { ownerId: session.userId } : {};
  const approvalWhere = session.role === "REP"
    ? { revision: { quote: { ownerId: session.userId }, currentForQuote: { isNot: null } }, status: "PENDING" as const }
    : session.role === "FINANCE"
      ? { level: "FINANCE" as const, status: "PENDING" as const, revision: { currentForQuote: { isNot: null }, approvalSteps: { some: { level: "MANAGER" as const, status: "APPROVED" as const } } } }
      : session.role === "MANAGER"
        ? { level: "MANAGER" as const, status: "PENDING" as const, revision: { currentForQuote: { isNot: null } } }
        : { status: "PENDING" as const, revision: { currentForQuote: { isNot: null } } };

  const now = new Date();
  const [pendingApprovals, customerAccessRequests, openQuotations, awaitingFulfillment, unpaidInvoices, revenue, recentActivity, tasks, health] = await Promise.all([
    prisma.approvalStep.count({ where: approvalWhere }),
    session.role === "ADMIN" ? prisma.customerAccessRequest.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
    prisma.quote.count({ where: { ...ownedQuote, customerStatus: { in: ["DRAFT", "SENT", "NEGOTIATING"] }, approvalStatus: { not: "REJECTED" } } }),
    prisma.order.count({ where: { quote: { ...ownedQuote, fulfillmentStatus: { in: ["PLANNED", "PARTIAL"] } } } }),
    prisma.invoice.findMany({ where: { status: { in: ["UNPAID", "PARTIAL"] }, order: { quote: ownedQuote } }, select: { totalPaise: true, paidPaise: true, creditNotes: { select: { amountPaise: true } } } }),
    prisma.payment.aggregate({ where: { receivedAt: { gte: startOfMonth(now) }, invoice: { order: { quote: ownedQuote } } }, _sum: { amountPaise: true } }),
    prisma.auditEvent.findMany({ where: { quote: ownedQuote }, include: { actor: true, quote: { include: { customer: true } } }, orderBy: { at: "desc" }, take: 10 }),
    prisma.task.findMany({ where: { assigneeId: session.userId, done: false }, include: { quote: { include: { customer: true } }, createdBy: true }, orderBy: { createdAt: "desc" } }),
    getDealHealth(session),
  ]);

  return {
    metrics: {
      pendingApprovals,
      customerAccessRequests,
      openQuotations,
      atRiskDeals: health.alerts.length,
      awaitingFulfillment,
      unpaidInvoices: unpaidInvoices.length,
      unpaidBalancePaise: unpaidInvoices.reduce((sum, invoice) => sum + invoiceRemainingPaise(invoice), 0),
      revenueThisMonthPaise: revenue._sum.amountPaise ?? 0,
    },
    recentActivity,
    tasks,
  };
}
