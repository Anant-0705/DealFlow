import "server-only";
import { prisma } from "@/lib/prisma";
export const listProducts = () => prisma.product.findMany({ include: { category: true, plan: true, variants: true }, orderBy: { name: "asc" } });
export const getProduct = (id: number) => prisma.product.findUnique({ where: { id }, include: { category: true, plan: true, variants: true } });
export const listPriceLists = () => prisma.priceList.findMany({ orderBy: { tier: "asc" } });
