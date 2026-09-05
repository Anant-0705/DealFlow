import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { PortalShell } from "@/components/layout/PortalShell";
export default async function PortalLayout({ children }: { children: React.ReactNode }) { const session = await requireSession(); if (session.role !== "CUSTOMER") redirect("/app/dashboard"); return <PortalShell name={session.name}>{children}</PortalShell>; }
