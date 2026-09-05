"use server";

import { compare, hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clearSession, setSession } from "@/lib/auth";

const credentialsSchema = z.object({ email: z.email().transform((v) => v.toLowerCase()), password: z.string().min(8) });

export async function login(formData: FormData) {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/login?error=Enter+a+valid+email+and+password");
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await compare(parsed.data.password, user.passwordHash))) redirect("/login?error=Email+or+password+is+incorrect");
  await setSession({ userId: user.id, role: user.role, name: user.name, customerId: user.customerId });
  redirect(user.role === "CUSTOMER" ? "/portal" : "/app/dashboard");
}

export async function signup(formData: FormData) {
  const parsed = credentialsSchema.extend({ name: z.string().trim().min(2).max(80) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/signup?error=Check+your+name,+email,+and+password");
  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) redirect("/signup?error=An+account+already+uses+that+email");
  const user = await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash: await hash(parsed.data.password, 10), role: "REP" } });
  await setSession({ userId: user.id, role: user.role, name: user.name, customerId: null });
  redirect("/app/dashboard");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
