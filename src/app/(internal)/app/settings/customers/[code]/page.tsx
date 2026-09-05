import Link from "next/link";
import { notFound } from "next/navigation";
import { updateCustomerBilling } from "@/modules/customers/actions";
import { getCustomerByCode } from "@/modules/customers/queries";
import { customerBillingGaps } from "@/modules/company/readiness";
import { CUSTOMER_MANAGER_ROLES } from "@/lib/roles";
import { requirePageRole } from "@/lib/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function CustomerBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requirePageRole(CUSTOMER_MANAGER_ROLES);
  const [{ code }, { error, notice }] = await Promise.all([params, searchParams]);
  const customer = await getCustomerByCode(code);
  if (!customer) notFound();
  const gaps = customerBillingGaps(customer);
  return (
    <div className="narrow-page">
      <Link className="back-link" href="/app/settings/customers">← Customers</Link>
      <div className="page-header">
        <div>
          <div className="eyebrow">{customer.code} · {customer.tier}</div>
          <h1>{customer.name}</h1>
          <p>Billing details print on quotations and invoices for this customer.</p>
        </div>
      </div>
      {error && <Alert variant="destructive"><AlertTitle>Could not save billing details</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {notice && <Alert><AlertTitle>Saved</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert>}
      {gaps.length > 0 && <Alert variant="destructive"><AlertTitle>Customer billing incomplete</AlertTitle><AlertDescription>Still needed: {gaps.map((item) => item.label).join(", ")}. Quotes for this customer cannot be sent, confirmed, or printed until these are saved.</AlertDescription></Alert>}
      <form action={updateCustomerBilling} className="panel form-stack">
        <input type="hidden" name="code" value={customer.code} />
        <label>Company name *<input name="name" required defaultValue={customer.name} minLength={2} maxLength={120} /></label>
        <label>Contact email *<input name="email" type="email" required defaultValue={customer.email} maxLength={254} /></label>
        <label>Phone *<input name="phone" required defaultValue={customer.phone} maxLength={20} placeholder="+91 80 2222 1001" /></label>
        <label>GSTIN *<input name="gstin" required defaultValue={customer.gstin} maxLength={15} /></label>
        <label>Billing address *<textarea name="billingAddress" required minLength={8} maxLength={240} defaultValue={customer.billingAddress} rows={3} /></label>
        <button className="button primary" type="submit">Save billing details</button>
      </form>
    </div>
  );
}
