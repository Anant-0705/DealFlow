"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "../../../prisma/seed";

export async function resetDemoData() {
  const session = await requireRole(["ADMIN"]);
  const startedAt = Date.now();
  await prisma.$transaction((db) => seedDatabase(db), { timeout: 120_000 });
  await prisma.$transaction(async (tx) => {
    await logEvent(tx, { entity: "SYSTEM", entityId: 1, action: "RESET", actorId: session.userId, reason: "Demo data restored from the canonical seed.", meta: { durationMs: Date.now() - startedAt } });
  });
  revalidatePath("/", "layout");
  redirect("/app/dashboard?notice=Demo+data+restored+—+25+quotes,+3+health+examples,+and+the+approval+inbox+are+ready");
}
