"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Columns3, FileText, LogOut, RefreshCw, Settings2 } from "lucide-react";
import { logout } from "@/modules/identity/actions";
import { reloadWorkspace } from "@/modules/quotes/actions";

export function TopMenu({ canConfigure }: { canConfigure: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [message, setMessage] = useState("");
  const refresh = async () => {
    await reloadWorkspace();
    router.refresh();
    setMessage("Pricing, stock and approvals refreshed");
    window.setTimeout(() => setMessage(""), 2600);
  };
  return <nav className="top-actions" aria-label="Workspace navigation">
    <div className="top-nav-primary">
      <Link href="/app/quotations" className={pathname.startsWith("/app/quotations") ? "active" : ""} aria-current={pathname.startsWith("/app/quotations") ? "page" : undefined}><FileText size={16}/><span className="menu-label">Quotations</span></Link>
      <Link href="/app/pipeline" className={pathname.startsWith("/app/pipeline") ? "active" : ""} aria-current={pathname.startsWith("/app/pipeline") ? "page" : undefined}><Columns3 size={16}/><span className="menu-label">Pipeline</span></Link>
    </div>
    <div className="top-utilities">
      <button type="button" onClick={refresh} title="Refresh pricing, stock and approvals"><RefreshCw size={16}/><span className="menu-label">Reload Data</span></button>
      {canConfigure ? <Link href="/app/settings" className={pathname.startsWith("/app/settings") ? "active" : ""}><Settings2 size={16}/><span className="menu-label">Go to Back-end</span></Link> : <span className="disabled-link" title="Admin or manager access required"><Settings2 size={16}/><span className="menu-label">Go to Back-end</span></span>}
      <form action={logout}><button className="close-workspace" title="Sign out and close workspace"><LogOut size={16}/><span className="menu-label">Close Workspace</span></button></form>
    </div>
    {message && <div className="toast" role="status">{message}</div>}
  </nav>;
}
