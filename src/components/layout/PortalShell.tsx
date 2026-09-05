import Link from "next/link";
import { logout } from "@/modules/identity/actions";
import { Button } from "@/components/ui/button";
export function PortalShell({ name, children }: { name: string; children: React.ReactNode }) { return <div className="portal-shell"><header><Link href="/portal" className="brand"><span className="brand-mark">A</span><span>AccordFlow</span></Link><nav><Link href="/portal">My Quotations</Link><Link href="/portal/messages">Messages</Link><Link href="/portal/profile">Profile</Link></nav><form action={logout}><Button variant="outline">Sign out · {name}</Button></form></header><main>{children}</main></div>; }
