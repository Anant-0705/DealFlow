import { createHmac, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@/generated/prisma/enums";
import { isUserRole } from "./roles";

export const sessionCookieName = "dealflow_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type SessionClaims = {
  userId: number;
  role: UserRole;
  name: string;
  customerId: number | null;
  exp: number;
};

export type AppSession = SessionClaims;

const TOKEN_VERSION = "v1";

function authSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  }
  if (!secret) {
    throw new Error("AUTH_SECRET is missing. Copy .env.example to .env and set a 32+ character secret.");
  }
  throw new Error("AUTH_SECRET must be at least 32 characters.");
}

function sign(value: string) {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}

function equal(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function parseClaims(value: unknown): SessionClaims | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (typeof body.userId !== "number" || !Number.isInteger(body.userId) || body.userId <= 0) return null;
  if (!isUserRole(body.role)) return null;
  if (typeof body.name !== "string" || body.name.length < 1 || body.name.length > 80) return null;
  if (body.customerId !== null && (typeof body.customerId !== "number" || !Number.isInteger(body.customerId) || body.customerId <= 0)) return null;
  if (body.role === "CUSTOMER" && body.customerId === null) return null;
  if (body.role !== "CUSTOMER" && body.customerId !== null) return null;
  if (typeof body.exp !== "number" || !Number.isFinite(body.exp) || body.exp <= Date.now()) return null;
  return {
    userId: body.userId,
    role: body.role,
    name: body.name,
    customerId: body.customerId,
    exp: body.exp,
  };
}

export function createSessionToken(session: Omit<SessionClaims, "exp">, ttlMs = SESSION_TTL_SECONDS * 1000) {
  const payload = Buffer.from(JSON.stringify({ ...session, exp: Date.now() + ttlMs })).toString("base64url");
  const body = `${TOKEN_VERSION}.${payload}`;
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token?: string): SessionClaims | null {
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  const body = token.slice(0, separator);
  const supplied = token.slice(separator + 1);
  if (!body.startsWith(`${TOKEN_VERSION}.`) || !supplied) return null;
  if (!equal(sign(body), supplied)) return null;
  try {
    return parseClaims(JSON.parse(Buffer.from(body.slice(TOKEN_VERSION.length + 1), "base64url").toString("utf8")));
  } catch {
    return null;
  }
}
