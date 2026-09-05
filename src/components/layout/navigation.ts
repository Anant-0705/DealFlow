import {
  BarChart3,
  Boxes,
  CircleDollarSign,
  Columns3,
  FileCheck2,
  FileText,
  HeartPulse,
  LayoutDashboard,
  ReceiptText,
  Settings2,
} from "lucide-react";
import type { UserRole } from "@/generated/prisma/enums";

export type NavigationItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  shortcut: string;
  roles?: readonly UserRole[];
};

export const navigationGroups: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard, shortcut: "D" },
      { label: "Quotations", href: "/app/quotations", icon: FileText, shortcut: "Q" },
      { label: "Pipeline", href: "/app/pipeline", icon: Columns3, shortcut: "P" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Approvals", href: "/app/approvals", icon: FileCheck2, shortcut: "A", roles: ["MANAGER", "FINANCE", "ADMIN"] },
      { label: "Fulfillment", href: "/app/fulfillment", icon: Boxes, shortcut: "F" },
      { label: "Billing", href: "/app/billing", icon: CircleDollarSign, shortcut: "B" },
      { label: "Invoices", href: "/app/invoices", icon: ReceiptText, shortcut: "I" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Deal Health", href: "/app/deal-health", icon: HeartPulse, shortcut: "H" },
      { label: "Reports", href: "/app/reports", icon: BarChart3, shortcut: "R" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Settings", href: "/app/settings", icon: Settings2, shortcut: "S", roles: ["MANAGER", "ADMIN"] },
    ],
  },
];

export function visibleNavigation(role: UserRole) {
  return navigationGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.roles || item.roles.includes(role)) }))
    .filter((group) => group.items.length > 0);
}
