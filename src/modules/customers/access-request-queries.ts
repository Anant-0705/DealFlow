import "server-only";

import { prisma } from "@/lib/prisma";

export function pendingCustomerAccessRequestCount() {
  return prisma.customerAccessRequest.count({ where: { status: "PENDING" } });
}

export function listPendingCustomerAccessRequests() {
  return prisma.customerAccessRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
}
