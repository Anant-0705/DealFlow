"use server";

import { compare, hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clearSession, getSession, setSession } from "@/lib/auth";
import { destinationFor, landingPath, safeNextPath } from "@/lib/roles";
import { hashToken, newToken, RESET_TTL_MS } from "@/lib/tokens";
import { isMailConfigured, sendMail } from "@/modules/mail/send";
import { passwordResetEmail } from "@/modules/mail/templates";
import { passwordResetUrl } from "@/modules/customers/links";
import { clearLoginAttempts, consumeLoginAttempt, consumeMailAttempt } from "./rate-limit";

const DUMMY_PASSWORD_HASH = "$2b$10$Ef7WJePB21MXJgHkTbupoOAE6/mVgOY/ToM78nnZzP40olDS4CvPC";

const credentialsSchema = z.object({
  email: z.email().trim().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72),
  next: z.string().optional(),
});

function failLogin(next?: string): never {
  const suffix = safeNextPath(next) ? `&next=${encodeURIComponent(safeNextPath(next)!)}` : "";
  redirect(`/login?error=Email+or+password+is+incorrect${suffix}`);
}

export async function login(formData: FormData) {
  const existing = await getSession();
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (existing) redirect(destinationFor(existing.role, parsed.success ? parsed.data.next : undefined));
  if (!parsed.success) redirect("/login?error=Enter+a+valid+email+and+password");

  const limit = consumeLoginAttempt(parsed.data.email);
  if (!limit.ok) redirect(`/login?error=Too+many+sign-in+attempts.+Try+again+in+${limit.retryMinutes}+minutes.`);

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, role: true, name: true, customerId: true, passwordHash: true },
  });
  const matches = await compare(parsed.data.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !matches) failLogin(parsed.data.next);
  if (user.role === "CUSTOMER" && user.customerId == null) failLogin(parsed.data.next);

  clearLoginAttempts(parsed.data.email);
  await setSession({
    userId: user.id,
    role: user.role,
    name: user.name,
    customerId: user.customerId,
  });
  redirect(destinationFor(user.role, parsed.data.next));
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

const emailOnlySchema = z.object({
  email: z.email().trim().max(254).transform((value) => value.toLowerCase()),
});
const resetSchema = z.object({
  token: z.string().trim().min(32).max(200),
  password: z.string().min(8).max(72),
});

export async function requestPasswordReset(formData: FormData) {
  const parsed = emailOnlySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/forgot-password?error=Enter+a+valid+email");
  if (!isMailConfigured()) redirect("/forgot-password?error=Email+is+not+configured+on+this+server.+Ask+an+administrator+to+set+RESEND_API_KEY.");
  const limit = consumeMailAttempt(parsed.data.email);
  if (!limit.ok) redirect(`/forgot-password?error=Too+many+reset+requests.+Try+again+in+${limit.retryMinutes}+minutes.`);

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, name: true, email: true } });
  if (user) {
    const token = newToken();
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } });
      await tx.passwordReset.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + RESET_TTL_MS) } });
    });
    await sendMail({ to: user.email, ...passwordResetEmail({ name: user.name, resetUrl: passwordResetUrl(token), expiresInHours: 1 }) });
  }
  redirect("/forgot-password?sent=1");
}

export async function resetPassword(formData: FormData) {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/reset-password?token=${encodeURIComponent(String(formData.get("token") ?? ""))}&error=Enter+a+password+of+at+least+8+characters`);
  const passwordHash = await hash(parsed.data.password, 12);
  const result = await prisma.$transaction(async (tx) => {
    const reset = await tx.passwordReset.findFirst({
      where: { tokenHash: hashToken(parsed.data.token), usedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userId: true, user: { select: { id: true, role: true, name: true, email: true, customerId: true } } },
    });
    if (!reset) return { error: "This reset link is invalid, expired, or has already been used." } as const;
    const claimed = await tx.passwordReset.updateMany({ where: { id: reset.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) return { error: "This reset link has already been used." } as const;
    await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
    await tx.passwordReset.updateMany({ where: { userId: reset.userId, usedAt: null }, data: { usedAt: new Date() } });
    return { user: reset.user } as const;
  });
  if ("error" in result && result.error) redirect(`/reset-password?token=${encodeURIComponent(parsed.data.token)}&error=${encodeURIComponent(result.error)}`);
  clearLoginAttempts(result.user.email);
  await setSession({ userId: result.user.id, role: result.user.role, name: result.user.name, customerId: result.user.customerId });
  redirect(landingPath(result.user.role));
}
