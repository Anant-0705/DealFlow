import { requireCustomer } from "@/lib/auth";
import { PortalShell } from "@/components/layout/PortalShell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireCustomer();
  return <PortalShell name={session.name}>{children}</PortalShell>;
}
