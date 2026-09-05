import { describe, expect, it } from "vitest";
import { destinationFor, hasRole, landingPath, safeNextPath, SETTINGS_ROLES } from "./roles";

describe("safeNextPath", () => {
  it("accepts in-app paths", () => {
    expect(safeNextPath("/app/quotations")).toBe("/app/quotations");
    expect(safeNextPath("/portal")).toBe("/portal");
  });
  it("rejects open redirects", () => {
    expect(safeNextPath("https://evil.test")).toBeNull();
    expect(safeNextPath("//evil.test")).toBeNull();
    expect(safeNextPath("/\\evil.test")).toBeNull();
    expect(safeNextPath("/app\n/quotations")).toBeNull();
    expect(safeNextPath("app/quotations")).toBeNull();
  });
});

describe("destinationFor", () => {
  it("keeps customers in the portal", () => {
    expect(destinationFor("CUSTOMER", "/app/quotations")).toBe("/portal");
    expect(destinationFor("CUSTOMER", "/portal")).toBe("/portal");
  });
  it("keeps internal users on /app next paths", () => {
    expect(destinationFor("REP", "/app/pipeline")).toBe("/app/pipeline");
    expect(destinationFor("REP", "/portal")).toBe("/app/dashboard");
  });
  it("falls back to the role landing page", () => {
    expect(landingPath("FINANCE")).toBe("/app/dashboard");
    expect(destinationFor("ADMIN", null)).toBe("/app/dashboard");
  });
  it("checks role groups", () => {
    expect(hasRole("MANAGER", SETTINGS_ROLES)).toBe(true);
    expect(hasRole("REP", SETTINGS_ROLES)).toBe(false);
  });
});
