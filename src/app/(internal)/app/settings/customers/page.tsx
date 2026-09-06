import Link from "next/link";
import { Check, UserPlus, X } from "lucide-react";
import { createCustomer, inviteCustomer } from "@/modules/customers/actions";
import { approveCustomerAccessRequest, rejectCustomerAccessRequest } from "@/modules/customers/access-request-actions";
import { listPendingCustomerAccessRequests } from "@/modules/customers/access-request-queries";
import { customerInviteUrl } from "@/modules/customers/links";
import { inviteMailCopy } from "@/modules/mail/templates";
import { listCustomers } from "@/modules/customers/queries";
import { customerBillingGaps } from "@/modules/company/readiness";
import { CUSTOMER_MANAGER_ROLES } from "@/lib/roles";
import { requirePageRole } from "@/lib/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function CustomersSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; customer?: string; error?: string; mail?: string; notice?: string; to?: string }>;
}) {
  const session = await requirePageRole(CUSTOMER_MANAGER_ROLES);
  const [{ invite, customer, error, mail, notice, to }, customers, accessRequests] = await Promise.all([
    searchParams,
    listCustomers(),
    session.role === "ADMIN" ? listPendingCustomerAccessRequests() : Promise.resolve([]),
  ]);
  const link = invite ? customerInviteUrl(invite) : null;
  const mailed = mail === "sent";

  return (
    <div className="form-stack">
      {notice && <Alert><Check aria-hidden="true"/><AlertTitle>Customer access updated</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert>}
      {session.role === "ADMIN" && (
        <Card id="access-requests">
          <CardHeader>
            <CardTitle>Customer account requests</CardTitle>
            <CardDescription>Review billing details submitted from “Need an account?”. Approval creates the customer for Sales Reps and sends a one-time portal invitation.</CardDescription>
            <CardAction><Badge variant={accessRequests.length ? "default" : "secondary"}>{accessRequests.length} pending</Badge></CardAction>
          </CardHeader>
          <CardContent>
            {accessRequests.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Primary contact</TableHead>
                    <TableHead>Billing details</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell><strong>{request.companyName}</strong>{request.gstin ? <small>{request.gstin}</small> : null}</TableCell>
                      <TableCell><a href={`mailto:${request.email}`}>{request.email}</a><small>{request.phone}</small></TableCell>
                      <TableCell className="max-w-72 whitespace-normal">{request.billingAddress}</TableCell>
                      <TableCell>{request.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <form action={approveCustomerAccessRequest} className="flex items-center gap-2">
                            <input type="hidden" name="requestId" value={request.id}/>
                            <NativeSelect name="tier" defaultValue="SILVER" aria-label={`Tier for ${request.companyName}`}>
                              <NativeSelectOption value="BRONZE">Bronze</NativeSelectOption>
                              <NativeSelectOption value="SILVER">Silver</NativeSelectOption>
                              <NativeSelectOption value="GOLD">Gold</NativeSelectOption>
                            </NativeSelect>
                            <SubmitButton size="sm" pendingLabel="Approving…"><UserPlus data-icon="inline-start"/>Approve & invite</SubmitButton>
                          </form>
                          <form action={rejectCustomerAccessRequest}>
                            <input type="hidden" name="requestId" value={request.id}/>
                            <SubmitButton size="sm" variant="outline" pendingLabel="Dismissing…" aria-label={`Dismiss request from ${request.companyName}`}><X data-icon="inline-start"/>Dismiss</SubmitButton>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="empty-cell"><UserPlus aria-hidden="true"/><strong>No pending account requests</strong><span>New requests will appear here and on the admin notification bell.</span></div>
            )}
          </CardContent>
        </Card>
      )}
      <div className="settings-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Customer access</span>
            <h2>{customers.length} customers</h2>
          </div>
        </div>
        <p className="muted">Create the company first. Portal logins are invitation-only: the contact chooses their own password from the emailed link.</p>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Could not complete that action</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {link && (
          <Alert>
            <AlertTitle>{mailed ? `Invitation emailed for ${customer}` : `Invitation ready for ${customer}`}</AlertTitle>
            <AlertDescription>
              {inviteMailCopy(mail, to)}
              <input className="invite-link" readOnly value={link} aria-label="Customer invitation link" />
            </AlertDescription>
          </Alert>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Billing</th>
                <th>Portal contacts</th>
                <th>Quotes</th>
                <th>Invite another contact</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((item) => {
                const gaps = customerBillingGaps(item);
                return (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <small>{item.code} · {item.tier} · {item.email}</small>
                  </td>
                  <td>
                    {gaps.length ? <small className="warn-copy">Incomplete · {gaps.map((gap) => gap.label).join(", ")}</small> : <small>Ready to print</small>}
                    <Link href={`/app/settings/customers/${item.code}`}>Edit billing</Link>
                  </td>
                  <td>
                    {item.users.map((user) => <small key={user.id}>{user.name} · {user.email}</small>)}
                    {item.invites.map((pending) => <small key={pending.id}>Invite pending · {pending.email}</small>)}
                    {!item.users.length && !item.invites.length && <small>No portal access yet</small>}
                  </td>
                  <td>{item._count.quotes}</td>
                  <td>
                    <form className="compact-form" action={inviteCustomer}>
                      <input type="hidden" name="customerId" value={item.id} />
                      <input name="email" type="email" placeholder="contact@company.com" aria-label={`Invite contact for ${item.name}`} required maxLength={254} />
                      <button className="button secondary small">Email invite</button>
                    </form>
                  </td>
                </tr>
              );
              })}
              {!customers.length && <tr><td colSpan={5} className="empty-cell">No customers yet. Create the first business record on the right.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Business record</span>
            <h2>Add a customer</h2>
          </div>
        </div>
        <p className="muted">This creates the company and emails a portal invitation to the primary contact. No password is generated here.</p>
        <form action={createCustomer} className="form-stack">
          <label>Company or customer name<input name="name" required minLength={2} maxLength={120} /></label>
          <label>
            Tier
            <select name="tier" defaultValue="SILVER">
              <option value="BRONZE">Bronze</option>
              <option value="SILVER">Silver</option>
              <option value="GOLD">Gold</option>
            </select>
          </label>
          <label>Primary contact email<input name="email" type="email" required maxLength={254} /></label>
          <label>Phone<input name="phone" required maxLength={20} /></label>
          <label>Billing address<textarea name="billingAddress" required minLength={8} maxLength={240} rows={3} /></label>
          <button type="submit" className="button primary">Create customer and email invite</button>
        </form>
      </section>
      </div>
    </div>
  );
}
