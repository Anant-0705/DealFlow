"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

const tabs = [["Customers", "/app/settings/customers"], ["Products", "/app/settings/products"], ["Price lists", "/app/settings/pricing"], ["Policy", "/app/settings/policy"], ["Warehouses", "/app/settings/warehouses"], ["Plans", "/app/settings/plans"], ["Upsell", "/app/settings/upsell"]] as const;

export function SettingsNav() {
  const pathname = usePathname(); const router = useRouter();
  return <><nav className="settings-side-nav" aria-label="Settings sections">{tabs.map(([label, href]) => <Link className={cn(pathname.startsWith(href) && "active")} aria-current={pathname.startsWith(href) ? "page" : undefined} key={href} href={href}>{label}</Link>)}</nav><NativeSelect className="settings-mobile-nav" aria-label="Settings section" value={tabs.find(([, href]) => pathname.startsWith(href))?.[1] ?? tabs[0][1]} onChange={(event) => router.push(event.target.value)}>{tabs.map(([label, href]) => <NativeSelectOption value={href} key={href}>{label}</NativeSelectOption>)}</NativeSelect></>;
}
