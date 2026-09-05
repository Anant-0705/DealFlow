import "server-only";
import { prisma } from "@/lib/prisma";
export const listPairings = () => prisma.productPairing.findMany({ include: { product: true, suggestedProduct: true }, orderBy: { weight: "desc" } });
