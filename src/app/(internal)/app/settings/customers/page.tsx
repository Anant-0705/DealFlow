import { createCustomerWithLogin, inviteCustomer } from "@/modules/customers/actions";
import { customerInviteUrl } from "@/modules/customers/links";
import { listCustomers } from "@/modules/customers/queries";
import { CUSTOMER_MANAGER_ROLES } from "@/lib/roles";
import { requirePageRole } from "@/lib/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cookies } from "next/headers";

const credentialsCookieName = "accordflow_created_credentials";

export default async function CustomersSettingsPage({ searchParams }: { searchParams: Promise<{ invite?: string; customer?: string; error?: string; credentials?: string }> }) {
  await requirePageRole(CUSTOMER_MANAGER_ROLES);
  const [{ invite, customer, error, credentials }, customers] = await Promise.all([searchParams, listCustomers()]);
  const link = invite ? customerInviteUrl(invite) : null;
  const credentialValue = credentials === "1" ? (await cookies()).get(credentialsCookieName)?.value : undefined;
  let generatedCredentials: { email: string; password: string } | null = null;
  if (credentialValue) {
    try {
      const parsed = JSON.parse(credentialValue) as { email?: unknown; password?: unknown };
      if (typeof parsed.email === "string" && typeof parsed.password === "string") generatedCredentials = { email: parsed.email, password: parsed.password };
    } catch {
      generatedCredentials = null;
    }
  }
  return <div className="settings-grid">
    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">Customer access</span><h2>{customers.length} customers</h2></div></div>
      <p className="muted">Create the business record first. Customer portal access is granted only through an invitation.</p>
      {error && <Alert variant="destructive"><AlertTitle>Could not complete that action</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {link && <Alert><AlertTitle>Invitation ready for {customer}</AlertTitle><AlertDescription>Copy this one-time link and send it to the contact. It expires in 7 days and is shown here because no email provider is configured yet.<input className="invite-link" readOnly value={link} aria-label="Customer invitation link" /></AlertDescription></Alert>}
      {generatedCredentials && <Alert><AlertTitle>Customer login generated for {customer}</AlertTitle><AlertDescription>Share these credentials securely. The temporary password is shown here for five minutes and is not stored in readable form.<div className="generated-credentials"><span>Email<strong>{generatedCredentials.email}</strong></span><span>Temporary password<strong>{generatedCredentials.password}</strong></span></div></AlertDescription></Alert>}
      <div className="table-scroll"><table><thead><tr><th>Customer</th><th>Portal contacts</th><th>Quotes</th><th>Invite another contact</th></tr></thead><tbody>{customers.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.code} · {item.tier} · {item.email}</small></td><td>{item.users.length ? item.users.map((user) => <small key={user.id}>{user.name} · {user.email}</small>) : <small>{item.invites.length ? `Invite pending · ${item.invites[0].email}` : "No portal access yet"}</small>}</td><td>{item._count.quotes}</td><td><form className="compact-form" action={inviteCustomer}><input type="hidden" name="customerId" value={item.id}/><input name="email" type="email" placeholder="contact@company.com" aria-label={`Invite contact for ${item.name}`} required maxLength={254}/><button className="button secondary small">Create invite</button></form></td></tr>)}{!customers.length && <tr><td colSpan={4} className="empty-cell">No customers yet. Create the first business record on the right.</td></tr>}</tbody></table></div>
    </section>
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">Business record</span><h2>Add a customer</h2></div></div><p className="muted">Create the company and generate its customer login immediately.</p><form action={createCustomerWithLogin} className="form-stack"><label>Company or customer name<input name="name" required minLength={2} maxLength={120} placeholder="Acme Corporation"/></label><label>Customer code<input name="code" required minLength={3} maxLength={32} placeholder="C-1004"/></label><label>Tier<select name="tier" defaultValue="SILVER"><option value="BRONZE">Bronze</option><option value="SILVER">Silver</option><option value="GOLD">Gold</option></select></label><label>Primary contact email<input name="email" type="email" required maxLength={254} placeholder="buyer@acme.com"/></label><button type="submit" className="button primary">Create customer & generate login</button></form></section>
  </div>;
}
