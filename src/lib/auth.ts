import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@/generated/prisma/enums";
import { createSessionToken, verifySessionToken, sessionCookieName, type AppSession } from "./session-token";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function setSession(session: Omit<AppSession, "exp">) {
  (await cookies()).set(sessionCookieName, createSessionToken(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: THIRTY_DAYS,
    path: "/",
  });
}

export async function clearSession() {
  (await cookies()).delete(sessionCookieName);
}

export async function getSession() {
  return verifySessionToken((await cookies()).get(sessionCookieName)?.value);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(roles: UserRole[]) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");
  if (!roles.includes(session.role)) throw new Error("You do not have permission to perform this action.");
  return session;
}

export type { AppSession };
export { sessionCookieName };
