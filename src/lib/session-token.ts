import { createHmac, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@/generated/prisma/enums";

export const sessionCookieName = "accordflow_session";
export type AppSession = { userId: number; role: UserRole; name: string; customerId: number | null; exp: number };
const secret = () => process.env.AUTH_SECRET || "local-demo-secret-change-before-production";
const signature = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function createSessionToken(session: Omit<AppSession, "exp">) {
  const payload = Buffer.from(JSON.stringify({ ...session, exp: Date.now() + 60 * 60 * 24 * 30 * 1000 })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifySessionToken(token?: string): AppSession | null {
  if (!token) return null;
  const [payload, supplied] = token.split(".");
  if (!payload || !supplied) return null;
  const expected = signature(payload); const a = Buffer.from(supplied); const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try { const value = JSON.parse(Buffer.from(payload, "base64url").toString()) as AppSession; return value.exp > Date.now() ? value : null; } catch { return null; }
}
