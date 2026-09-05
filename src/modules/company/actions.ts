"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { formObject } from "@/lib/validation";
import { companySchema } from "./schemas";

const LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const LOGO_MAX_BYTES = 400_000;

function errorPath(message: string) {
  return `/app/settings/company?error=${encodeURIComponent(message)}`;
}

async function logoFromForm(formData: FormData, existing: string | null) {
  if (String(formData.get("removeLogo") ?? "") === "on") return null;
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return existing;
  if (file.size > LOGO_MAX_BYTES) throw new Error("Logo must be 400 KB or smaller.");
  if (!LOGO_TYPES.has(file.type)) throw new Error("Upload a PNG, JPEG, WebP, or SVG logo.");
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function saveCompanyProfile(formData: FormData) {
  const session = await requireRole(["ADMIN", "MANAGER"]);
  const parsed = companySchema.safeParse(formObject(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Check the company details and try again.";
    redirect(errorPath(first));
  }
  const current = await prisma.companyProfile.findUnique({ where: { id: 1 }, select: { logoDataUrl: true } });
  let logoDataUrl = current?.logoDataUrl ?? null;
  try {
    logoDataUrl = await logoFromForm(formData, logoDataUrl);
  } catch (error) {
    redirect(errorPath(error instanceof Error ? error.message : "Could not read the logo file."));
  }
  const data = { ...parsed.data, logoDataUrl };
  await prisma.$transaction(async (tx) => {
    await tx.companyProfile.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
    await logEvent(tx, { entity: "COMPANY", entityId: 1, action: "SETTINGS_CHANGED", actorId: session.userId, reason: "Company letterhead updated.", meta: { legalName: data.legalName, gstin: data.gstin } });
  });
  revalidatePath("/app/settings/company");
  revalidatePath("/app/print", "layout");
  revalidatePath("/app/quotations", "layout");
  revalidatePath("/app/invoices", "layout");
  revalidatePath("/app/dashboard");
  redirect("/app/settings/company?notice=Company+letterhead+saved");
}
