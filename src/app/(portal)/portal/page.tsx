import { requireCustomer } from "@/lib/auth";
import { PortalQuoteList } from "@/components/portal/PortalQuoteList";
import { listPortalQuotes } from "@/modules/negotiation/queries";

export default async function PortalPage() {
  const session = await requireCustomer();
  const quotes = await listPortalQuotes(session.customerId);
  return <div className="portal-page"><div className="eyebrow">Customer portal</div><h1>My quotations</h1><p className="muted">Review live terms, request changes, and confirm the latest approved revision.</p><PortalQuoteList quotes={quotes}/></div>;
}
