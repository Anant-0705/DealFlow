import "server-only";
import { prisma } from "@/lib/prisma";
export const listWarehouses = () => prisma.warehouse.findMany({ include: { stock: { include: { product: true, variant: true } } }, orderBy: { name: "asc" } });
