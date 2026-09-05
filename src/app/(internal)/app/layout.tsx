import { requireInternal } from "@/lib/auth";
import { pendingApprovalCount } from "@/modules/approvals/queries";
import { AppShell } from "@/components/layout/AppShell";
import { hasRole, APPROVER_ROLES } from "@/lib/roles";

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireInternal();
  const count = hasRole(session.role, APPROVER_ROLES) ? await pendingApprovalCount(session.role) : 0;
  return <AppShell session={session} pendingCount={count}>{children}</AppShell>;
}
