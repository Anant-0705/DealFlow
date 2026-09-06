import { requireInternal } from "@/lib/auth";
import { pendingApprovalCount } from "@/modules/approvals/queries";
import { AppShell } from "@/components/layout/AppShell";
import { hasRole, APPROVER_ROLES } from "@/lib/roles";
import { listCommandQuotes } from "@/modules/quotes/queries";
import { pendingCustomerAccessRequestCount } from "@/modules/customers/access-request-queries";

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireInternal();
  const [approvalCount, customerRequestCount, quotes] = await Promise.all([
    hasRole(session.role, APPROVER_ROLES) ? pendingApprovalCount(session.role) : Promise.resolve(0),
    session.role === "ADMIN" ? pendingCustomerAccessRequestCount() : Promise.resolve(0),
    listCommandQuotes(),
  ]);
  return <AppShell session={session} approvalCount={approvalCount} customerRequestCount={customerRequestCount} quotes={quotes}>{children}</AppShell>;
}
