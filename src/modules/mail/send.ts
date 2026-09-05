export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type MailResult =
  | { delivered: true; id: string }
  | { delivered: false; reason: "not_configured" | "provider"; message?: string };

type MailTransport = (input: MailMessage & { from: string }) => Promise<{ id?: string | null }>;

let testTransport: MailTransport | null = null;

export function setMailTransportForTests(transport: MailTransport | null) {
  testTransport = transport;
}

export function mailFromAddress() {
  return process.env.RESEND_FROM?.trim() || "DealFlow <onboarding@resend.dev>";
}

export function isMailConfigured() {
  return Boolean(testTransport) || Boolean(process.env.RESEND_API_KEY?.trim());
}

export function mailStatus(result: MailResult) {
  if (result.delivered) return "sent";
  return result.reason === "not_configured" ? "skipped" : "failed";
}

async function resendTransport(apiKey: string): Promise<MailTransport> {
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  return async (input) => {
    const result = await resend.emails.send({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (result.error) throw new Error(result.error.message);
    return { id: result.data?.id };
  };
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!testTransport && !apiKey) return { delivered: false, reason: "not_configured" };
  try {
    const transport = testTransport ?? (await resendTransport(apiKey!));
    const result = await transport({ from: mailFromAddress(), ...message });
    return { delivered: true, id: result.id || "sent" };
  } catch (error) {
    return { delivered: false, reason: "provider", message: error instanceof Error ? error.message : "Email could not be sent." };
  }
}
