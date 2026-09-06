"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/audit";
import { requireRole, setSession } from "@/lib/auth";
import { CUSTOMER_MANAGER_ROLES } from "@/lib/roles";
import { hashToken } from "@/lib/tokens";
import { sendMail, mailStatus } from "@/modules/mail/send";
import { customerInviteEmail } from "@/modules/mail/templates";
import { customerInviteUrl } from "./links";
import { issueInvite } from "./invite";
import { nextCustomerCode } from "@/lib/codes";

const emailSchema = z.email().trim().max(254).transform((value) => value.toLowerCase());
const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  tier: z.enum(["BRONZE", "SILVER", "GOLD"]),
  email: emailSchema,
  phone: z.string().trim().regex(/^[+0-9][0-9\s-]{7,19}$/, "Enter a valid customer phone number."),
  billingAddress: z.string().trim().min(8, "Enter the billing address.").max(240),
});
const gstinSchema = z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a 15-character customer GSTIN.");
const billingSchema = customerSchema.omit({ tier: true }).extend({ gstin: gstinSchema });
const portalBillingSchema = z.object({
  phone: customerSchema.shape.phone,
  gstin: gstinSchema,
  billingAddress: customerSchema.shape.billingAddress,
});
const inviteSchema = z.object({ customerId: z.coerce.number().int().positive(), email: emailSchema });
const acceptSchema = z.object({
  token: z.string().trim().min(32).max(200),
  name: z.string().trim().min(2).max(80).regex(/^[\p{L}\p{M}\p{N} .'-]+$/u, "Enter a valid name"),
  password: z.string().min(8).max(72),
});

const errorPath = (message: string) => `/app/settings/customers?error=${encodeURIComponent(message)}`;

function invitePath(args: { token: string; customerName: string; email: string; mail: string }) {
  const params = new URLSearchParams({
    invite: args.token,
    customer: args.customerName,
    to: args.email,
    mail: args.mail,
  });
  return `/app/settings/customers?${params.toString()}`;
}

async function emailIsAvailable(email: string, exceptCustomerId?: number) {
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) return "That email already belongs to an account. Use a different contact email.";
  const pending = await prisma.customerInvite.findFirst({
    where: {
      email,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      ...(exceptCustomerId ? { customerId: { not: exceptCustomerId } } : {}),
    },
    select: { id: true },
  });
  if (pending) return "That email already has a pending invitation for another customer.";
  return null;
}

async function sendInviteEmail(args: { to: string; customerName: string; token: string }) {
  const content = customerInviteEmail({ customerName: args.customerName, acceptUrl: customerInviteUrl(args.token), expiresInDays: 7 });
  return sendMail({ to: args.to, ...content });
}

export async function createCustomer(formData: FormData) {
  const session = await requireRole(CUSTOMER_MANAGER_ROLES);
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(errorPath(parsed.error.issues[0]?.message ?? "Check the company name, tier, contact, and billing details."));
  const blocked = await emailIsAvailable(parsed.data.email);
  if (blocked) redirect(errorPath(blocked));
  const issued = await prisma.$transaction(async (tx) => {
    const code = await nextCustomerCode(tx);
    const customer = await tx.customer.create({ data: { name: parsed.data.name, code, tier: parsed.data.tier, email: parsed.data.email, phone: parsed.data.phone, gstin: "", billingAddress: parsed.data.billingAddress } });
    const token = await issueInvite(tx, customer.id, parsed.data.email, session.userId);
    await logEvent(tx, { entity: "CUSTOMER", entityId: customer.id, action: "SETTINGS_CHANGED", actorId: session.userId, reason: `Created ${customer.name} and issued a portal invitation to ${parsed.data.email}.` });
    return { customerName: customer.name, token };
  });
  const mail = await sendInviteEmail({ to: parsed.data.email, customerName: issued.customerName, token: issued.token });
  redirect(invitePath({ token: issued.token, customerName: issued.customerName, email: parsed.data.email, mail: mailStatus(mail) }));
}

export async function inviteCustomer(formData: FormData) {
  const session = await requireRole(CUSTOMER_MANAGER_ROLES);
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(errorPath("Enter a valid contact email."));
  const blocked = await emailIsAvailable(parsed.data.email, parsed.data.customerId);
  if (blocked) redirect(errorPath(blocked));
  const customer = await prisma.customer.findUnique({ where: { id: parsed.data.customerId }, select: { id: true, name: true } });
  if (!customer) redirect(errorPath("Customer not found."));
  const token = await prisma.$transaction(async (tx) => {
    const issued = await issueInvite(tx, customer.id, parsed.data.email, session.userId);
    await logEvent(tx, { entity: "CUSTOMER", entityId: customer.id, action: "SETTINGS_CHANGED", actorId: session.userId, reason: `Issued a portal invitation to ${parsed.data.email} for ${customer.name}.` });
    return issued;
  });
  const mail = await sendInviteEmail({ to: parsed.data.email, customerName: customer.name, token });
  redirect(invitePath({ token, customerName: customer.name, email: parsed.data.email, mail: mailStatus(mail) }));
}

function acceptInviteError(token: string, message: string) {
  return `/accept-invite?token=${encodeURIComponent(token)}&error=${encodeURIComponent(message)}`;
}

export async function acceptCustomerInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const parsed = acceptSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message = issue?.path[0] === "token"
      ? "This invitation is invalid, expired, or has already been used."
      : issue?.path[0] === "password"
        ? "Enter a password of at least 8 characters."
        : issue?.message ?? "Enter a valid name.";
    redirect(acceptInviteError(token, message));
  }
  const passwordHash = await hash(parsed.data.password, 12);
  const result = await prisma.$transaction(async (tx) => {
    const invite = await tx.customerInvite.findFirst({ where: { tokenHash: hashToken(parsed.data.token), acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, email: true, customerId: true } });
    if (!invite) return { error: "This invitation is invalid, expired, or has already been used." } as const;
    const existingUser = await tx.user.findUnique({ where: { email: invite.email }, select: { id: true } });
    if (existingUser) return { error: "This email already has an account. Sign in with that account instead." } as const;
    const claimed = await tx.customerInvite.updateMany({ where: { id: invite.id, acceptedAt: null, revokedAt: null }, data: { acceptedAt: new Date() } });
    if (claimed.count !== 1) return { error: "This invitation has already been used." } as const;
    const user = await tx.user.create({ data: { email: invite.email, passwordHash, name: parsed.data.name, role: "CUSTOMER", customerId: invite.customerId }, select: { id: true, role: true, name: true, customerId: true } });
    return { user } as const;
  });
  if ("error" in result && result.error) redirect(acceptInviteError(parsed.data.token, result.error));
  await setSession({ userId: result.user.id, role: result.user.role, name: result.user.name, customerId: result.user.customerId });
  redirect("/portal");
}

export async function updateCustomerBilling(formData: FormData) {
  const session = await requireRole(CUSTOMER_MANAGER_ROLES);
  const code = String(formData.get("code") ?? "").trim();
  const parsed = billingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/app/settings/customers/${encodeURIComponent(code)}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the billing details.")}`);
  const blocked = await emailIsAvailable(parsed.data.email);
  const customer = await prisma.customer.findUnique({ where: { code }, select: { id: true, email: true } });
  if (!customer) redirect(errorPath("Customer not found."));
  if (blocked && parsed.data.email !== customer.email) redirect(`/app/settings/customers/${encodeURIComponent(code)}?error=${encodeURIComponent(blocked)}`);
  await prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: customer.id },
      data: { name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone, gstin: parsed.data.gstin, billingAddress: parsed.data.billingAddress },
    });
    await logEvent(tx, { entity: "CUSTOMER", entityId: customer.id, action: "SETTINGS_CHANGED", actorId: session.userId, reason: `Updated billing details for ${parsed.data.name}.` });
  });
  revalidatePath("/app/settings/customers");
  revalidatePath(`/app/settings/customers/${code}`);
  revalidatePath("/app/print", "layout");
  revalidatePath("/app/quotations", "layout");
  revalidatePath("/app/invoices", "layout");
  redirect(`/app/settings/customers/${encodeURIComponent(code)}?notice=${encodeURIComponent("Customer billing details saved")}`);
}

export async function updatePortalBilling(formData: FormData) {
  const session = await requireRole(["CUSTOMER"]);
  if (session.customerId == null) redirect("/portal/profile?error=Customer+record+missing");
  const parsed = portalBillingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/portal/profile?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check phone, GSTIN, and billing address.")}`);
  await prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: session.customerId! },
      data: { phone: parsed.data.phone, gstin: parsed.data.gstin, billingAddress: parsed.data.billingAddress },
    });
    await logEvent(tx, { entity: "CUSTOMER", entityId: session.customerId!, action: "SETTINGS_CHANGED", actorId: session.userId, reason: "Customer updated portal billing details." });
  });
  revalidatePath("/portal/profile");
  revalidatePath("/portal");
  redirect("/portal/profile?notice=Billing+details+saved");
}
