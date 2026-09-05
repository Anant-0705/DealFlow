import { createQuote } from "@/modules/quotes/actions";
import { requirePageRole } from "@/lib/auth";
import { QUOTE_EDITOR_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
export default async function NewQuotePage() { await requirePageRole(QUOTE_EDITOR_ROLES); const customers = await prisma.customer.findMany({ orderBy: { name: "asc" } }); return <div className="narrow-page"><div className="page-header"><div><div className="eyebrow">New quotation</div><h1>Choose a customer</h1><p>The customer tier selects the trusted price list and discount ceiling.</p></div></div><form action={createQuote} className="panel form-stack"><label>Customer<select name="customerId" required>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.tier}</option>)}</select></label><button className="button primary">Create quotation and open builder</button></form></div>; }
