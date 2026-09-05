import "server-only";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/enums";

export function getApprovalInbox(role: UserRole, all = false) {
  const level = role === "FINANCE" ? "FINANCE" : "MANAGER";
  return prisma.approvalStep.findMany({
    where: {
      level,
      ...(all ? {} : { status: "PENDING" }),
      ...(level === "FINANCE" ? { revision: { approvalSteps: { some: { level: "MANAGER", status: "APPROVED" } } } } : {}),
    },
    include: { revision: { include: { quote: { include: { customer: true, owner: true } } } }, actor: true },
    orderBy: { createdAt: "asc" },
  });
}

export function pendingApprovalCount(role: UserRole) {
  const level = role === "FINANCE" ? "FINANCE" : "MANAGER";
  return prisma.approvalStep.count({ where: { level, status: "PENDING", ...(level === "FINANCE" ? { revision: { approvalSteps: { some: { level: "MANAGER", status: "APPROVED" } } } } : {}) } });
}
