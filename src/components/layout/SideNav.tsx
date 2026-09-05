"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, CircleDollarSign, FileCheck2, FileText, HeartPulse, LayoutDashboard, ReceiptText } from "lucide-react";
import type { UserRole } from "@/generated/prisma/enums";
import { APPROVER_ROLES, hasRole } from "@/lib/roles";
const items = [["Dashboard", "/app/dashboard", LayoutDashboard], ["Quotations", "/app/quotations", FileText], ["Approvals", "/app/approvals", FileCheck2], ["Fulfillment", "/app/fulfillment", Boxes], ["Billing", "/app/billing", CircleDollarSign], ["Invoices", "/app/invoices", ReceiptText], ["Deal Health", "/app/deal-health", HeartPulse], ["Reports", "/app/reports", BarChart3]] as const;
export function SideNav({ pendingCount, role }: { pendingCount: number; role: UserRole }) {
  const path = usePathname();
  const visible = items.filter(([label]) => label !== "Approvals" || hasRole(role, APPROVER_ROLES));
  return <aside className="sidebar"><Link className="brand" href="/app/dashboard"><span className="brand-mark">A</span><span>AccordFlow<small>Deal governance</small></span></Link><nav>{visible.map(([label, href, Icon]) => <Link key={href} href={href} className={path.startsWith(href) ? "active" : ""}><Icon size={18}/><span>{label}</span>{label === "Approvals" && pendingCount > 0 && <b>{pendingCount}</b>}</Link>)}</nav><div className="sidebar-foot"><span className="live-dot"/>All systems operational</div></aside>;
}
