export function appBaseUrl() {
  return (process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
}

export function customerInviteUrl(token: string) {
  return `${appBaseUrl()}/accept-invite?token=${encodeURIComponent(token)}`;
}

export function passwordResetUrl(token: string) {
  return `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}
