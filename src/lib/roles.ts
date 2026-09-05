import type { UserRole } from "@/generated/prisma/enums";

export const USER_ROLES = ["REP", "MANAGER", "FINANCE", "ADMIN", "CUSTOMER"] as const satisfies readonly UserRole[];

export const INTERNAL_ROLES = ["REP", "MANAGER", "FINANCE", "ADMIN"] as const satisfies readonly UserRole[];
export const APPROVER_ROLES = ["MANAGER", "FINANCE", "ADMIN"] as const satisfies readonly UserRole[];
export const SETTINGS_ROLES = ["ADMIN", "MANAGER"] as const satisfies readonly UserRole[];
export const QUOTE_EDITOR_ROLES = ["REP", "ADMIN"] as const satisfies readonly UserRole[];

export type InternalRole = (typeof INTERNAL_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

export function hasRole<T extends UserRole>(role: UserRole, allowed: readonly T[]): role is T {
  return allowed.includes(role as T);
}

export function landingPath(role: UserRole) {
  return role === "CUSTOMER" ? "/portal" : "/app/dashboard";
}

export function safeNextPath(value: string | null | undefined) {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.includes("://") || value.includes("\\") || /\s/.test(value)) return null;
  if (value.length > 256) return null;
  return value;
}

export function destinationFor(role: UserRole, next: string | null | undefined) {
  const path = safeNextPath(next);
  if (!path) return landingPath(role);
  if (role === "CUSTOMER") return path.startsWith("/portal") ? path : "/portal";
  if (path.startsWith("/app")) return path;
  return landingPath(role);
}
