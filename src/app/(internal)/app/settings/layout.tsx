import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
const tabs = [["Products", "/app/settings/products"], ["Price lists", "/app/settings/pricing"], ["Policy", "/app/settings/policy"], ["Warehouses", "/app/settings/warehouses"], ["Plans", "/app/settings/plans"], ["Upsell", "/app/settings/upsell"]];
export default async function SettingsLayout({ children }: { children: React.ReactNode }) { const session = await requireSession(); if (!["ADMIN", "MANAGER"].includes(session.role)) redirect("/app/dashboard"); return <div><div className="page-header"><div><div className="eyebrow">Back-end configuration</div><h1>Settings</h1><p>Stored rules drive every calculation and approval decision.</p></div></div><nav className="settings-tabs">{tabs.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>{children}</div>; }
