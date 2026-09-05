"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { UserRole } from "@/generated/prisma/enums";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

const tabs = [["Company", "/app/settings/company"], ["Customers", "/app/settings/customers"], ["Products", "/app/settings/products"], ["Price lists", "/app/settings/pricing"], ["Policy", "/app/settings/policy"], ["Warehouses", "/app/settings/warehouses"], ["Plans", "/app/settings/plans"], ["Upsell", "/app/settings/upsell"], ["System", "/app/settings/system"]] as const;

export function SettingsNav({ role }: { role: UserRole }) {
  const pathname = usePathname(); const router = useRouter();
  const visibleTabs = tabs.filter(([label]) => label !== "System" || role === "ADMIN");
  return <><nav className="settings-side-nav" aria-label="Settings sections">{visibleTabs.map(([label, href]) => <Link className={cn(pathname.startsWith(href) && "active")} aria-current={pathname.startsWith(href) ? "page" : undefined} key={href} href={href}>{label}</Link>)}</nav><NativeSelect className="settings-mobile-nav" aria-label="Settings section" value={visibleTabs.find(([, href]) => pathname.startsWith(href))?.[1] ?? visibleTabs[0][1]} onChange={(event) => router.push(event.target.value)}>{visibleTabs.map(([label, href]) => <NativeSelectOption value={href} key={href}>{label}</NativeSelectOption>)}</NativeSelect></>;
}
