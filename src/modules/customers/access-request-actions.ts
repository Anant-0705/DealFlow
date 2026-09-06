"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logEvent } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { nextCustomerCode } from "@/lib/codes";
import { prisma } from "@/lib/prisma";
import { consumeAccessRequestAttempt } from "@/modules/identity/rate-limit";
import { mailStatus, sendMail } from "@/modules/mail/send";
import { customerInviteEmail } from "@/modules/mail/templates";
import { issueInvite } from "./invite";
import { customerInviteUrl } from "./links";
import {
  customerAccessRequestSchema,
  reviewCustomerAccessRequestSchema,
  type CustomerAccessRequestFormState,
} from "./access-request-schema";

const successMessage = "Request received. A DealFlow administrator will review your details and email an activation link after approval.";

export async function submitCustomerAccessRequest(
  _previousState: CustomerAccessRequestFormState,
  formData: FormData,
): Promise<CustomerAccessRequestFormState> {
  const parsed = customerAccessRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted details and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const rateLimit = consumeAccessRequestAttempt(parsed.data.email);
  if (!rateLimit.ok) {
    return {
      status: "error",
      message: `Too many requests. Try again in ${rateLimit.retryMinutes} minute${rateLimit.retryMinutes === 1 ? "" : "s"}.`,
    };
  }

  const [existingUser, existingCustomer, existingRequest] = await Promise.all([
    prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } }),
    prisma.customer.findFirst({ where: { email: parsed.data.email }, select: { id: true } }),
    prisma.customerAccessRequest.findUnique({ where: { email: parsed.data.email }, select: { id: true, status: true } }),
  ]);

  // Keep this response deliberately generic so the public form cannot reveal which emails already exist.
  if (existingUser || existingCustomer || existingRequest?.status === "APPROVED") {
    return { status: "success", message: successMessage };
  }

  const data = { ...parsed.data, gstin: "", status: "PENDING" as const, customerId: null, reviewedById: null, reviewedAt: null };
  if (existingRequest) {
    await prisma.customerAccessRequest.update({ where: { id: existingRequest.id }, data });
  } else {
    await prisma.customerAccessRequest.create({ data });
  }

  revalidatePath("/app", "layout");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/settings/customers");
  return { status: "success", message: successMessage };
}

function adminRequestPath(message: string, kind: "notice" | "error" = "error") {
  return `/app/settings/customers?${kind}=${encodeURIComponent(message)}#access-requests`;
}

export async function approveCustomerAccessRequest(formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const parsed = reviewCustomerAccessRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(adminRequestPath("Choose a valid request and customer tier."));

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "CustomerAccessRequest" WHERE id = ${parsed.data.requestId} FOR UPDATE`;
    const request = await tx.customerAccessRequest.findUnique({ where: { id: parsed.data.requestId } });
    if (!request || request.status !== "PENDING") return { error: "This account request has already been reviewed." } as const;

    const existingUser = await tx.user.findUnique({ where: { email: request.email }, select: { id: true } });
    if (existingUser) return { error: "That email already belongs to an existing account." } as const;

    const existingCustomer = await tx.customer.findFirst({ where: { email: request.email }, select: { id: true, name: true } });
    const customer = existingCustomer ?? await tx.customer.create({
      data: {
        name: request.companyName,
        code: await nextCustomerCode(tx),
        tier: parsed.data.tier,
        email: request.email,
        phone: request.phone,
        gstin: request.gstin,
        billingAddress: request.billingAddress,
      },
      select: { id: true, name: true },
    });

    const token = await issueInvite(tx, customer.id, request.email, session.userId);
    await tx.customerAccessRequest.update({
      where: { id: request.id },
      data: { status: "APPROVED", customerId: customer.id, reviewedById: session.userId, reviewedAt: new Date() },
    });
    await logEvent(tx, {
      entity: "CUSTOMER",
      entityId: customer.id,
      action: "SETTINGS_CHANGED",
      actorId: session.userId,
      reason: `Approved the portal access request for ${request.companyName} and issued an invitation to ${request.email}.`,
    });
    return { customerName: customer.name, email: request.email, token } as const;
  });

  if ("error" in result && result.error) redirect(adminRequestPath(result.error));

  const content = customerInviteEmail({
    customerName: result.customerName,
    acceptUrl: customerInviteUrl(result.token),
    expiresInDays: 7,
  });
  const mail = await sendMail({ to: result.email, ...content });
  const params = new URLSearchParams({
    notice: `${result.customerName} is now available to Sales Reps for quotations.`,
    invite: result.token,
    customer: result.customerName,
    to: result.email,
    mail: mailStatus(mail),
  });
  revalidatePath("/app", "layout");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/settings/customers");
  revalidatePath("/app/quotations/new");
  redirect(`/app/settings/customers?${params.toString()}#access-requests`);
}

export async function rejectCustomerAccessRequest(formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const requestId = Number(formData.get("requestId"));
  if (!Number.isInteger(requestId) || requestId <= 0) redirect(adminRequestPath("Choose a valid account request."));

  const updated = await prisma.customerAccessRequest.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: { status: "REJECTED", reviewedById: session.userId, reviewedAt: new Date() },
  });
  if (updated.count !== 1) redirect(adminRequestPath("This account request has already been reviewed."));

  revalidatePath("/app", "layout");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/settings/customers");
  redirect(adminRequestPath("Account request dismissed.", "notice"));
}
