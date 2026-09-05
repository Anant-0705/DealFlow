"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, MessageSquare, UserRound, FileText } from "lucide-react";
import { logout } from "@/modules/identity/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PortalShell({ name, customer, children }: { name: string; customer: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const links = [["My quotations", "/portal", FileText], ["Messages", "/portal/messages", MessageSquare], ["Profile", "/portal/profile", UserRound]] as const;
  return <div className="portal-shell"><header><Link href="/portal" className="brand"><span className="brand-mark" aria-hidden="true">A</span><span>AccordFlow<small>{customer} · Customer Portal</small></span></Link><nav aria-label="Customer navigation">{links.map(([label, href, Icon]) => <Link key={href} href={href} className={cn(pathname === href && "active")} aria-current={pathname === href ? "page" : undefined}><Icon/> {label}</Link>)}</nav><form action={logout}><Button type="submit" variant="outline"><LogOut/> <span className="menu-label">Sign out · {name}</span></Button></form></header><main>{children}</main></div>;
}
