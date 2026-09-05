const replacements: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => replacements[char] ?? char);
}

export function transactionalEmail(args: {
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  steps?: string[];
  ctaLabel: string;
  ctaUrl: string;
  expiry: string;
  note: string;
}) {
  const steps = (args.steps ?? [])
    .map((step, index) => `<tr><td style="padding:0 0 10px;font-size:14px;line-height:1.5;color:#302925;"><strong style="color:#245e3e;">${index + 1}.</strong> ${escapeHtml(step)}</td></tr>`)
    .join("");
  const stepsBlock = steps
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr><td style="padding:0 0 10px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#4f3f37;">What happens next</td></tr>${steps}</table>`
    : "";
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(args.title)}</title></head>
<body style="margin:0;padding:0;background:#edede9;color:#302925;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(args.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#edede9;padding:28px 12px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#f5ebe0;border:1px solid #d6ccc2;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:22px 28px;background:#245e3e;color:#dce9e0;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:34px;height:34px;border-radius:10px;background:#63dc92;color:#123321;font-weight:900;text-align:center;line-height:34px;">D</td>
          <td style="padding-left:10px;">
            <div style="font-size:16px;font-weight:750;color:#fff;">DealFlow</div>
            <div style="font-size:11px;color:#8bedaa;">Quote to cash, with a paper trail</div>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:28px;">
        <div style="margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#725a4e;">${escapeHtml(args.eyebrow)}</div>
        <h1 style="margin:0 0 14px;font-size:26px;line-height:1.2;letter-spacing:-.03em;">${escapeHtml(args.title)}</h1>
        <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#756a63;">${args.intro}</p>
        ${stepsBlock}
        <a href="${escapeHtml(args.ctaUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#245e3e;color:#fff;font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(args.ctaLabel)}</a>
        <p style="margin:18px 0 0;font-size:13px;line-height:1.55;color:#756a63;">${escapeHtml(args.expiry)}</p>
        <p style="margin:8px 0 0;font-size:12px;line-height:1.55;color:#756a63;">${escapeHtml(args.note)}</p>
      </td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid #d6ccc2;font-size:11px;color:#756a63;">DealFlow does not put passwords in email. If you did not expect this, you can ignore it.</td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
