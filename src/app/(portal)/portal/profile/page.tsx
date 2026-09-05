import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getPortalProfile } from "@/modules/negotiation/queries";
import { updatePortalBilling } from "@/modules/customers/actions";
import { customerBillingGaps } from "@/modules/company/readiness";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function PortalProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const [session, query] = await Promise.all([requireSession(), searchParams]);
  const customer = await getPortalProfile(session.customerId!);
  if (!customer) notFound();
  const gaps = customerBillingGaps(customer);
  return (
    <div className="portal-page narrow-page">
      <div className="eyebrow">Customer profile</div>
      <h1>{customer.name}</h1>
      {query.error && <Alert variant="destructive"><AlertTitle>Could not save billing details</AlertTitle><AlertDescription>{query.error}</AlertDescription></Alert>}
      {query.notice && <Alert><AlertTitle>Saved</AlertTitle><AlertDescription>{query.notice.replaceAll("+", " ")}</AlertDescription></Alert>}
      {gaps.length > 0 && <Alert variant="destructive"><AlertTitle>Billing details required</AlertTitle><AlertDescription>Add phone, GSTIN, and billing address before you can confirm a quotation. Still needed: {gaps.map((item) => item.label).join(", ")}.</AlertDescription></Alert>}
      <section className="panel profile-card">
        <div><span>Account code</span><b>{customer.code}</b></div>
        <div><span>Tier</span><StatusBadge status={customer.tier}/></div>
        <div><span>Contact email</span><b>{customer.email}</b></div>
      </section>
      <form action={updatePortalBilling} className="panel form-stack">
        <div><span className="eyebrow">Billing</span><h2>Details for quotations and invoices</h2></div>
        <label>Phone *<input name="phone" required defaultValue={customer.phone} maxLength={20} /></label>
        <label>GSTIN *<input name="gstin" required defaultValue={customer.gstin} maxLength={15} /></label>
        <label>Billing address *<textarea name="billingAddress" required minLength={8} maxLength={240} rows={3} defaultValue={customer.billingAddress} /></label>
        <button className="button primary" type="submit">Save billing details</button>
      </form>
    </div>
  );
}
