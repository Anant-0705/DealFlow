import { SideNav } from "./SideNav";
import { TopMenu } from "./TopMenu";
import type { AppSession } from "@/lib/auth";

export function AppShell({ session, pendingCount, children }: { session: AppSession; pendingCount: number; children: React.ReactNode }) {
  const roleLabel = { REP: "Sales Rep", MANAGER: "Sales Manager", FINANCE: "Finance", ADMIN: "Administrator", CUSTOMER: "Customer" }[session.role];
  const initials = session.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  return <div className="app-shell">
    <SideNav pendingCount={pendingCount}/>
    <div className="app-main">
      <header className="topbar"><div className="topbar-inner">
        <TopMenu canConfigure={["ADMIN", "MANAGER"].includes(session.role)}/>
        <div className="identity" aria-label={`Signed in as ${session.name}, ${roleLabel}`}>
          <span className="identity-avatar">{initials}<i/></span>
          <div><strong>{session.name}</strong><small>{roleLabel}</small></div>
        </div>
      </div></header>
      <main className="page-content">{children}</main>
    </div>
  </div>;
}
