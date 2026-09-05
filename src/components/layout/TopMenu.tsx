"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, RefreshCw, Settings2 } from "lucide-react";
import { logout } from "@/modules/identity/actions";
import { reloadWorkspace } from "@/modules/quotes/actions";
export function TopMenu({ canConfigure }: { canConfigure: boolean }) { const router = useRouter(); const [message, setMessage] = useState(""); const refresh = async () => { await reloadWorkspace(); router.refresh(); setMessage("Pricing, stock and approvals refreshed"); window.setTimeout(() => setMessage(""), 2600); }; return <div className="top-actions"><Link href="/app/quotations">Quotations</Link><Link href="/app/pipeline">Pipeline</Link><button onClick={refresh}><RefreshCw size={15}/>Reload Data</button>{canConfigure ? <Link href="/app/settings"><Settings2 size={15}/>Go to Back-end</Link> : <span className="disabled-link" title="Admin or manager access required"><Settings2 size={15}/>Go to Back-end</span>}<form action={logout}><button><LogOut size={15}/>Close Workspace</button></form>{message && <div className="toast">{message}</div>}</div>; }
