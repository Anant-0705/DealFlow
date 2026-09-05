"use server";

import { createHash, randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireRole, setSession } from "@/lib/auth";
import { CUSTOMER_MANAGER_ROLES } from "@/lib/roles";

const emailSchema = z.email().trim().max(254).transform((value) => value.toLowerCase());
const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9-]{2,31}$/, "Use 3–32 letters, numbers, or hyphens."),
  tier: z.enum(["BRONZE", "SILVER", "GOLD"]),
  email: emailSchema,
});
const inviteSchema = z.object({ customerId: z.coerce.number().int().positive(), email: emailSchema });
const acceptSchema = z.object({
  token: z.string().trim().min(32).max(200),
  name: z.string().trim().min(2).max(80).regex(/^[\p{L}\p{M}\p{N} .'-]+$/u, "Enter a valid name"),
  password: z.string().min(8).max(72),
});

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");
const credentialsCookieName = "accordflow_created_credentials";
const errorPath = (message: string, token?: string) => `/app/settings/customers?error=${encodeURIComponent(message)}${token ? `&token=${encodeURIComponent(token)}` : ""}`;

async function issueInvite(tx: Prisma.TransactionClient, customerId: number, email: string, createdById: number) {
  const token = newToken();
  const now = new Date();
  await tx.customerInvite.updateMany({ where: { customerId, email, acceptedAt: null, revokedAt: null }, data: { revokedAt: now } });
  await tx.customerInvite.create({ data: { customerId, email, tokenHash: tokenHash(token), expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), createdById } });
  return token;
}

export async function createCustomerWithLogin(formData: FormData) {
  await requireRole(CUSTOMER_MANAGER_ROLES);
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(errorPath("Check the company name, code, tier, and contact email."));
  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (existingUser) redirect(errorPath("That email already belongs to an account. Use a different login email."));
  const duplicateCode = await prisma.customer.findUnique({ where: { code: parsed.data.code }, select: { id: true } });
  if (duplicateCode) redirect(errorPath("A customer with that code already exists."));
  const temporaryPassword = randomBytes(12).toString("base64url");
  const passwordHash = await hash(temporaryPassword, 12);
  const result = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({ data: { name: parsed.data.name, code: parsed.data.code, tier: parsed.data.tier, email: parsed.data.email } });
    await tx.user.create({ data: { name: customer.name, email: parsed.data.email, passwordHash, role: "CUSTOMER", customerId: customer.id } });
    return { customerName: customer.name };
  });
  (await cookies()).set(credentialsCookieName, JSON.stringify({ email: parsed.data.email, password: temporaryPassword }), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 300, path: "/app/settings/customers" });
  redirect(`/app/settings/customers?credentials=1&customer=${encodeURIComponent(result.customerName)}`);
}


export async function inviteCustomer(formData: FormData) {
  const session = await requireRole(CUSTOMER_MANAGER_ROLES);
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(errorPath("Enter a valid contact email."));
  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (existingUser) redirect(errorPath("That email already belongs to an account. Invite a different contact email."));
  const customer = await prisma.customer.findUnique({ where: { id: parsed.data.customerId }, select: { id: true, name: true } });
  if (!customer) redirect(errorPath("Customer not found."));
  const token = await prisma.$transaction((tx) => issueInvite(tx, customer.id, parsed.data.email, session.userId));
  redirect(`/app/settings/customers?invite=${encodeURIComponent(token)}&customer=${encodeURIComponent(customer.name)}`);
}

export async function acceptCustomerInvite(formData: FormData) {
  const parsed = acceptSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/accept-invite?token=${encodeURIComponent(String(formData.get("token") ?? ""))}&error=Enter+your+name+and+a+password+of+at+least+8+characters`);
  const passwordHash = await hash(parsed.data.password, 12);
  const result = await prisma.$transaction(async (tx) => {
    const invite = await tx.customerInvite.findFirst({ where: { tokenHash: tokenHash(parsed.data.token), acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, email: true, customerId: true } });
    if (!invite) return { error: "This invitation is invalid, expired, or has already been used." } as const;
    const existingUser = await tx.user.findUnique({ where: { email: invite.email }, select: { id: true } });
    if (existingUser) return { error: "This email already has an account. Sign in with that account instead." } as const;
    const claimed = await tx.customerInvite.updateMany({ where: { id: invite.id, acceptedAt: null, revokedAt: null }, data: { acceptedAt: new Date() } });
    if (claimed.count !== 1) return { error: "This invitation has already been used." } as const;
    const user = await tx.user.create({ data: { email: invite.email, passwordHash, name: parsed.data.name, role: "CUSTOMER", customerId: invite.customerId }, select: { id: true, role: true, name: true, customerId: true } });
    return { user } as const;
  });
  if ("error" in result && result.error) redirect(`/accept-invite?token=${encodeURIComponent(parsed.data.token)}&error=${encodeURIComponent(result.error)}`);
  await setSession({ userId: result.user.id, role: result.user.role, name: result.user.name, customerId: result.user.customerId });
  redirect("/portal");
}
