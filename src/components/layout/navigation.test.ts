import { describe, expect, it } from "vitest";
import { navigationGroups, visibleNavigation } from "./navigation";

describe("workspace navigation", () => {
  it("keeps sensitive destinations role-aware", () => {
    const rep = visibleNavigation("REP").flatMap((group) => group.items).map((item) => item.href);
    const admin = visibleNavigation("ADMIN").flatMap((group) => group.items).map((item) => item.href);
    expect(rep).not.toContain("/app/approvals");
    expect(rep).not.toContain("/app/settings");
    expect(admin).toContain("/app/approvals");
    expect(admin).toContain("/app/settings");
  });

  it("does not duplicate primary routes", () => {
    const routes = navigationGroups.flatMap((group) => group.items.map((item) => item.href));
    expect(new Set(routes).size).toBe(routes.length);
  });
});
