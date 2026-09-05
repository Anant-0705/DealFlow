"use server";

import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clearSession, getSession, setSession } from "@/lib/auth";
import { destinationFor, safeNextPath } from "@/lib/roles";
import { clearLoginAttempts, consumeLoginAttempt } from "./rate-limit";

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
