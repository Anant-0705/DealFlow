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

export function onBehalfConfirmedEmail(args: {
  customerName: string;
  quoteCode: string;
  version: number;
  totalLabel: string;
  actorName: string;
  channelLabel: string;
  note: string;
  portalUrl: string;
}) {
  const customerName = escapeHtml(args.customerName);
  const actorName = escapeHtml(args.actorName);
  const quoteCode = escapeHtml(args.quoteCode);
  return {
    subject: `${args.quoteCode} was confirmed on your behalf`,
    text: [
      `Hello ${args.customerName},`,
      `${args.actorName} confirmed quotation ${args.quoteCode} v${args.version} (${args.totalLabel}) on your behalf.`,
      `They recorded that you agreed by ${args.channelLabel}: ${args.note}`,
      "This creates the order and invoices. Review it in your portal. If you did not authorize this, report it there.",
      args.portalUrl,
    ].join("\n\n"),
    html: transactionalEmail({
      preheader: `${args.actorName} confirmed ${args.quoteCode} on your behalf. Review it, or report if this was not you.`,
      eyebrow: "Quotation confirmed",
      title: `${args.quoteCode} is now an order`,
      intro: `Hello ${customerName}, <strong>${actorName}</strong> confirmed quotation <strong>${quoteCode}</strong> v${args.version} (${escapeHtml(args.totalLabel)}) on your behalf.`,
      steps: [
        `They recorded that you agreed by ${args.channelLabel}: ${args.note}`,
        "This creates the order and the invoices.",
        "If you did not authorize this, open the quotation and report it. Fulfillment pauses until it is reviewed.",
      ],
      ctaLabel: "Review quotation",
      ctaUrl: args.portalUrl,
      expiry: "You can report an unauthorized confirmation from the portal at any time until your team marks the review done.",
      note: "If you did agree, you can ignore the report option and wait for invoices in the portal.",
    }),
  };
}

export function unauthorizedConfirmCustomerEmail(args: { customerName: string; quoteCode: string; portalUrl: string }) {
  const customerName = escapeHtml(args.customerName);
  const quoteCode = escapeHtml(args.quoteCode);
  return {
    subject: `We received your report on ${args.quoteCode}`,
    text: [
      `Hello ${args.customerName},`,
      `We received your report that you did not authorize ${args.quoteCode}.`,
      "A sales manager and finance have been asked to review it. Stock will not be reserved or shipped until they close that review.",
      args.portalUrl,
    ].join("\n\n"),
    html: transactionalEmail({
      preheader: `Your report on ${args.quoteCode} is with your sales manager and finance.`,
      eyebrow: "Confirmation review",
      title: "We received your report",
      intro: `Hello ${customerName}, we received your report that you did not authorize <strong>${quoteCode}</strong>.`,
      steps: [
        "A sales manager and finance have been asked to review it.",
        "Stock will not be reserved or shipped until they close that review.",
      ],
      ctaLabel: "Open quotation",
      ctaUrl: args.portalUrl,
      expiry: "This does not automatically cancel invoices that were already issued. Finance handles those.",
      note: "If you sent this by mistake, reply to your sales representative in the portal.",
    }),
  };
}

export function unauthorizedConfirmReviewerEmail(args: {
  reviewerName: string;
  customerName: string;
  quoteCode: string;
  note: string;
  quoteUrl: string;
}) {
  const reviewerName = escapeHtml(args.reviewerName);
  const customerName = escapeHtml(args.customerName);
  const quoteCode = escapeHtml(args.quoteCode);
  return {
    subject: `${args.customerName} reported they did not authorize ${args.quoteCode}`,
    text: [
      `Hi ${args.reviewerName},`,
      `${args.customerName} reported that they did not authorize ${args.quoteCode}.`,
      args.note,
      "Do not reserve or ship this order until the review is closed.",
      args.quoteUrl,
    ].join("\n\n"),
    html: transactionalEmail({
      preheader: `${args.customerName} flagged ${args.quoteCode}. Fulfillment is paused until you review it.`,
      eyebrow: "Customer dispute",
      title: `${args.quoteCode} needs a review`,
      intro: `Hi ${reviewerName}, <strong>${customerName}</strong> reported that they did not authorize <strong>${quoteCode}</strong>.`,
      steps: [
        args.note,
        "Do not reserve or ship this order until you close the review on your dashboard.",
      ],
      ctaLabel: "Open quotation",
      ctaUrl: args.quoteUrl,
      expiry: "The customer can see that their report was received.",
      note: "Mark the assigned task done only after you have spoken with the customer or issued a credit.",
    }),
  };
}

export function inviteMailCopy(status: string | undefined, to?: string) {
  if (status === "sent") return to ? `Invitation emailed to ${to}. The one-time link is also below if they need it resent by hand.` : "Invitation emailed. The one-time link is also below if they need it resent by hand.";
  if (status === "skipped") return "Email is not configured on this server (missing RESEND_API_KEY). Copy the one-time link and send it to the contact.";
  if (status === "failed") return "The invitation email could not be sent. Copy the one-time link below and send it to the contact.";
  return "Copy this one-time link and send it to the contact. It expires in 7 days.";
}
