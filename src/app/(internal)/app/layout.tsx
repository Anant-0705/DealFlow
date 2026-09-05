import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { pendingApprovalCount } from "@/modules/approvals/queries";
import { AppShell } from "@/components/layout/AppShell";
export default async function InternalLayout({ children }: { children: React.ReactNode }) { const session = await requireSession(); if (session.role === "CUSTOMER") redirect("/portal"); const count = ["MANAGER", "FINANCE", "ADMIN"].includes(session.role) ? await pendingApprovalCount(session.role) : 0; return <AppShell session={session} pendingCount={count}>{children}</AppShell>; }
