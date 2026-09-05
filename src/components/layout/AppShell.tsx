import { SideNav } from "./SideNav";
import { TopMenu } from "./TopMenu";
import type { AppSession } from "@/lib/auth";
import { hasRole, SETTINGS_ROLES } from "@/lib/roles";

export function AppShell({ session, pendingCount, quotes, children }: { session: AppSession; pendingCount: number; quotes: Array<{ code: string; customer: { name: string } }>; children: React.ReactNode }) {
  return <div className="app-shell">
    <SideNav pendingCount={pendingCount} role={session.role}/>
    <div className="app-main">
      <header className="topbar"><div className="topbar-inner">
        <TopMenu name={session.name} role={session.role} pendingCount={pendingCount} quotes={quotes} canConfigure={hasRole(session.role, SETTINGS_ROLES)}/>
      </div></header>
      <main id="main-content" tabIndex={-1} className="page-content">{children}</main>
    </div>
  </div>;
}
