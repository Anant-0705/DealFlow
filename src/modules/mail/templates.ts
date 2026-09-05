import { escapeHtml, transactionalEmail } from "./html";

export function customerInviteEmail(args: { customerName: string; acceptUrl: string; expiresInDays: number }) {
  const name = escapeHtml(args.customerName);
  return {
    subject: `Activate your ${args.customerName} portal on DealFlow`,
    text: [
      `You have been invited to the DealFlow customer portal for ${args.customerName}.`,
      "DealFlow is where your company reviews quotations, confirms the agreed version, and pays invoices.",
      "What happens next:",
      "1. Activate this invitation and choose your name and password.",
      `2. Open quotations sent to ${args.customerName}.`,
      "3. Confirm the version you agree to.",
      "4. Pay invoices from the portal when they are issued.",
      `Activate your access: ${args.acceptUrl}`,
      `This invitation expires in ${args.expiresInDays} days and can be used once.`,
      "DealFlow does not put passwords in email. If you were not expecting this, you can ignore it.",
    ].join("\n\n"),
    html: transactionalEmail({
      preheader: `Activate portal access for ${args.customerName}, then review quotations, confirm, and pay invoices.`,
      eyebrow: "Customer portal invitation",
      title: "You're invited to DealFlow",
      intro: `You have been invited to the customer portal for <strong>${name}</strong>. This is where quotations are reviewed, confirmed, and billed — not a login with a generated password.`,
      steps: [
        "Activate this invitation and choose your name and password.",
        `Open quotations sent to ${args.customerName}.`,
        "Confirm the version your company agrees to.",
        "Pay invoices from the portal when they are issued.",
      ],
      ctaLabel: "Activate portal access",
      ctaUrl: args.acceptUrl,
      expiry: `This invitation expires in ${args.expiresInDays} days and can be used once.`,
      note: "If you were not expecting this invitation, you can ignore the email.",
    }),
  };
}

export function passwordResetEmail(args: { name: string; resetUrl: string; expiresInHours: number }) {
  const hours = args.expiresInHours === 1 ? "1 hour" : `${args.expiresInHours} hours`;
  return {
    subject: "Reset your DealFlow password",
    text: [
      `Hi ${args.name},`,
      "We received a request to reset the password for your DealFlow account.",
      `Choose a new password: ${args.resetUrl}`,
      `This link expires in ${hours} and can be used once.`,
      "If you did not request a reset, you can ignore this email. Your current password will stay the same.",
    ].join("\n\n"),
    html: transactionalEmail({
      preheader: `Choose a new DealFlow password. This link expires in ${hours}.`,
      eyebrow: "Account security",
      title: "Reset your DealFlow password",
      intro: `Hi ${escapeHtml(args.name)}, we received a request to reset the password for your DealFlow workspace. Use the button below to choose a new one.`,
      ctaLabel: "Choose a new password",
      ctaUrl: args.resetUrl,
      expiry: `This link expires in ${hours} and can be used once.`,
      note: "If you did not request a reset, you can ignore this email. Your current password will stay the same.",
    }),
  };
}

export function inviteMailCopy(status: string | undefined, to?: string) {
  if (status === "sent") return to ? `Invitation emailed to ${to}. The one-time link is also below if they need it resent by hand.` : "Invitation emailed. The one-time link is also below if they need it resent by hand.";
  if (status === "skipped") return "Email is not configured on this server (missing RESEND_API_KEY). Copy the one-time link and send it to the contact.";
  if (status === "failed") return "The invitation email could not be sent. Copy the one-time link below and send it to the contact.";
  return "Copy this one-time link and send it to the contact. It expires in 7 days.";
}
