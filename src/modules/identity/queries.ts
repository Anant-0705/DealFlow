import "server-only";
import { prisma } from "@/lib/prisma";

export const listUsers = () => prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true } });
