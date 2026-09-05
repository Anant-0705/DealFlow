import "server-only";
import { prisma } from "@/lib/prisma";
export const getPolicy = () => prisma.discountPolicy.findUniqueOrThrow({ where: { id: 1 } });
export const getCategoryCeilings = () => prisma.category.findMany({ orderBy: { name: "asc" } });
