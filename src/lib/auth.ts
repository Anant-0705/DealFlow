import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { forbidden, redirect, unauthorized } from "next/navigation";
import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { hasRole, landingPath } from "@/lib/roles";
import {
  createSessionToken,
  sessionCookieName,
  SESSION_TTL_SECONDS,
  verifySessionToken,
  type AppSession,
} from "./session-token";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function setSession(session: Omit<AppSession, "exp">) {
  (await cookies()).set(sessionCookieName, createSessionToken(session), {
    ...cookieOptions,
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession() {
  (await cookies()).set(sessionCookieName, "", {
    ...cookieOptions,
    maxAge: 0,
  });
}

export const getSession = cache(async (): Promise<AppSession | null> => {
  const claims = verifySessionToken((await cookies()).get(sessionCookieName)?.value);
  if (!claims) return null;
  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: { id: true, role: true, name: true, customerId: true },
  });
  if (!user) return null;
  if (user.role === "CUSTOMER" && user.customerId == null) return null;
  if (user.role !== "CUSTOMER" && user.customerId != null) return null;
  return {
    userId: user.id,
    role: user.role,
    name: user.name,
    customerId: user.customerId,
    exp: claims.exp,
  };
});

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireInternal() {
  const session = await requireSession();
  if (session.role === "CUSTOMER") redirect("/portal");
  return session;
}

export async function requireCustomer() {
  const session = await requireSession();
  if (session.role !== "CUSTOMER" || session.customerId == null) redirect("/app/dashboard");
  return { ...session, customerId: session.customerId };
}

export async function requirePageRole<T extends UserRole>(roles: readonly T[]) {
  const session = await requireSession();
  if (!hasRole(session.role, roles)) redirect(session.role === "CUSTOMER" ? "/portal" : "/app/dashboard?notice=You+do+not+have+access+to+that+page");
  return session;
}

export async function requireRole<T extends UserRole>(roles: readonly T[]) {
  const session = await getSession();
  if (!session) unauthorized();
  if (!hasRole(session.role, roles)) forbidden();
  return session;
}

export { landingPath, sessionCookieName };
export type { AppSession };
