import "server-only";
import { prisma } from "@/lib/prisma";
export const listPlans = () => prisma.subscriptionPlan.findMany({ orderBy: { name: "asc" } });
