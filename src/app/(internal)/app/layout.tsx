import { requireInternal } from "@/lib/auth";
import { pendingApprovalCount } from "@/modules/approvals/queries";
import { AppShell } from "@/components/layout/AppShell";
import { hasRole, APPROVER_ROLES } from "@/lib/roles";
import { listCommandQuotes } from "@/modules/quotes/queries";

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireInternal();
  const [count, quotes] = await Promise.all([
    hasRole(session.role, APPROVER_ROLES) ? pendingApprovalCount(session.role) : Promise.resolve(0),
    listCommandQuotes(),
  ]);
  return <AppShell session={session} pendingCount={count} quotes={quotes}>{children}</AppShell>;
}
