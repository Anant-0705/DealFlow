"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Columns3, FileText, LogOut, RefreshCw, Settings2 } from "lucide-react";
import { logout } from "@/modules/identity/actions";
import { reloadWorkspace } from "@/modules/quotes/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <Link href="/app/quotations" className={buttonVariants({ variant: pathname.startsWith("/app/quotations") ? "default" : "ghost" })} aria-current={pathname.startsWith("/app/quotations") ? "page" : undefined}><FileText data-icon="inline-start"/><span className="menu-label">Quotations</span></Link>
      <Link href="/app/pipeline" className={buttonVariants({ variant: pathname.startsWith("/app/pipeline") ? "default" : "ghost" })} aria-current={pathname.startsWith("/app/pipeline") ? "page" : undefined}><Columns3 data-icon="inline-start"/><span className="menu-label">Pipeline</span></Link>
    </div>
    <div className="top-utilities">
      <Button variant="ghost" type="button" onClick={refresh} title="Refresh pricing, stock and approvals"><RefreshCw data-icon="inline-start"/><span className="menu-label">Reload Data</span></Button>
      {canConfigure ? <Link href="/app/settings" className={buttonVariants({ variant: pathname.startsWith("/app/settings") ? "secondary" : "ghost" })}><Settings2 data-icon="inline-start"/><span className="menu-label">Go to Back-end</span></Link> : <span className={cn(buttonVariants({ variant: "ghost" }), "disabled-link")} title="Admin or manager access required"><Settings2 data-icon="inline-start"/><span className="menu-label">Go to Back-end</span></span>}
      <form action={logout}><Button variant="ghost" className="close-workspace" title="Sign out and close workspace"><LogOut data-icon="inline-start"/><span className="menu-label">Close Workspace</span></Button></form>
    </div>
    {message && <div className="toast" role="status">{message}</div>}
  </nav>;
}
