export function customerInviteUrl(token: string) {
  return `${(process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000").replace(/\/$/, "")}/accept-invite?token=${encodeURIComponent(token)}`;
}
