import { escapeHtml } from "./html";

export function customerInviteEmail(args: { customerName: string; acceptUrl: string; expiresInDays: number }) {
  const name = escapeHtml(args.customerName);
  const url = escapeHtml(args.acceptUrl);
  return {
    subject: `Activate your ${args.customerName} portal on DealFlow`,
    text: [
      `You have been invited to the DealFlow customer portal for ${args.customerName}.`,
      `Open this link to choose your name and password: ${args.acceptUrl}`,
      `This invitation expires in ${args.expiresInDays} days and can be used once.`,
      "If you were not expecting this, you can ignore the email.",
    ].join("\n\n"),
    html: `<p>You have been invited to the DealFlow customer portal for <strong>${name}</strong>.</p><p><a href="${url}">Activate your access</a> to choose your name and password.</p><p>This invitation expires in ${args.expiresInDays} days and can be used once.</p><p>If you were not expecting this, you can ignore the email.</p>`,
  };
}

export function passwordResetEmail(args: { name: string; resetUrl: string; expiresInHours: number }) {
  const name = escapeHtml(args.name);
  const url = escapeHtml(args.resetUrl);
  return {
    subject: "Reset your DealFlow password",
    text: [
      `Hi ${args.name},`,
      `Use this link to choose a new DealFlow password: ${args.resetUrl}`,
      `This link expires in ${args.expiresInHours} hour and can be used once.`,
      "If you did not request a reset, you can ignore this email.",
    ].join("\n\n"),
    html: `<p>Hi ${name},</p><p><a href="${url}">Choose a new password</a> for your DealFlow account.</p><p>This link expires in ${args.expiresInHours} hour and can be used once.</p><p>If you did not request a reset, you can ignore this email.</p>`,
  };
}

export function inviteMailCopy(status: string | undefined, to?: string) {
  if (status === "sent") return to ? `Invitation emailed to ${to}. The one-time link is also below if they need it resent by hand.` : "Invitation emailed. The one-time link is also below if they need it resent by hand.";
  if (status === "skipped") return "Email is not configured on this server (missing RESEND_API_KEY). Copy the one-time link and send it to the contact.";
  if (status === "failed") return "The invitation email could not be sent. Copy the one-time link below and send it to the contact.";
  return "Copy this one-time link and send it to the contact. It expires in 7 days.";
}
