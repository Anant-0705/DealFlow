import "server-only";

import { prisma } from "@/lib/prisma";
import { documentErrorMessage, documentGaps, documentsReady, emptyCompany } from "./readiness";

export async function getCompanyProfile() {
  const profile = await prisma.companyProfile.findUnique({ where: { id: 1 } });
  return profile ?? { id: 1, ...emptyCompany(), createdAt: new Date(0), updatedAt: new Date(0) };
}

export async function getDocumentParties(customerId: number) {
  const [company, customer] = await Promise.all([
    getCompanyProfile(),
    prisma.customer.findUnique({ where: { id: customerId } }),
  ]);
  const gaps = documentGaps(company, customer ?? undefined);
  return {
    company,
    customer,
    gaps,
    ready: documentsReady(gaps),
    message: documentErrorMessage(gaps, customer?.name),
  };
}
