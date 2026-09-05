import { describe, expect, it } from "vitest";
import { escapeHtml } from "./html";
import { customerInviteEmail, inviteMailCopy, passwordResetEmail } from "./templates";

describe("mail templates", () => {
  it("escapes HTML in names and urls", () => {
    expect(escapeHtml(`Acme <script> & "Co"`)).toBe("Acme &lt;script&gt; &amp; &quot;Co&quot;");
  });

  it("builds an invite that never includes a generated password", () => {
    const email = customerInviteEmail({
      customerName: `Acme <Corp>`,
      acceptUrl: "http://localhost:3000/accept-invite?token=abc",
      expiresInDays: 7,
    });
    expect(email.subject).toContain("Acme <Corp>");
    expect(email.html).toContain("Acme &lt;Corp&gt;");
    expect(email.html).toContain("http://localhost:3000/accept-invite?token=abc");
    expect(email.html).toContain("Activate portal access");
    expect(email.html).toContain("Confirm the version");
    expect(email.text).toContain("choose your name and password");
    expect(email.text).toContain("Pay invoices from the portal");
    expect(email.html.toLowerCase()).not.toContain("temporary password");
    expect(email.text.toLowerCase()).not.toContain("temporary password");
  });

  it("builds a password reset that includes the one-hour link", () => {
    const email = passwordResetEmail({ name: "Ravi", resetUrl: "http://localhost:3000/reset-password?token=xyz", expiresInHours: 1 });
    expect(email.subject).toBe("Reset your DealFlow password");
    expect(email.text).toContain("http://localhost:3000/reset-password?token=xyz");
    expect(email.html).toContain("Choose a new password");
    expect(email.html).toContain("expires in 1 hour");
    expect(email.text).toContain("current password will stay the same");
  });

  it("explains invite mail outcomes", () => {
    expect(inviteMailCopy("sent", "buyer@acme.test")).toContain("buyer@acme.test");
    expect(inviteMailCopy("skipped")).toContain("RESEND_API_KEY");
    expect(inviteMailCopy("failed")).toContain("could not be sent");
  });
});
