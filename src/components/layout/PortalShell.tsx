import Link from "next/link";
import { logout } from "@/modules/identity/actions";
export function PortalShell({ name, children }: { name: string; children: React.ReactNode }) { return <div className="portal-shell"><header><Link href="/portal" className="brand"><span className="brand-mark">A</span><span>AccordFlow</span></Link><nav><Link href="/portal">My Quotation</Link><span>Messages</span><span>Profile</span></nav><form action={logout}><button className="button secondary">Sign out · {name}</button></form></header><main>{children}</main></div>; }
