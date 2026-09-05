import { requireCustomer } from "@/lib/auth";
import { PortalShell } from "@/components/layout/PortalShell";
import { getPortalProfile } from "@/modules/negotiation/queries";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireCustomer();
  const customer = await getPortalProfile(session.customerId);
  return <PortalShell name={session.name} customer={customer?.name ?? "Customer"}>{children}</PortalShell>;
}
