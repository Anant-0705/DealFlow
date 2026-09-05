import Link from "next/link";
import { createQuote } from "@/modules/quotes/actions";
import { requirePageRole } from "@/lib/auth";
import { QUOTE_EDITOR_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { customerBillingGaps, companyIdentityGaps } from "@/modules/company/readiness";
import { getCompanyProfile } from "@/modules/company/queries";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function NewQuotePage() {
  await requirePageRole(QUOTE_EDITOR_ROLES);
  const [customers, company] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    getCompanyProfile(),
  ]);
  const companyGaps = companyIdentityGaps(company);
  return (
    <div className="narrow-page">
      <div className="page-header">
        <div>
          <div className="eyebrow">New quotation</div>
          <h1>Choose a customer</h1>
          <p>The customer tier selects the trusted price list and discount ceiling. Billing details must be complete before the quote can be sent or printed.</p>
        </div>
      </div>
      {companyGaps.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Company letterhead is incomplete</AlertTitle>
          <AlertDescription>
            Missing {companyGaps.map((item) => item.label).join(", ")}.{" "}
            <Link href="/app/settings/company">Open Settings → Company</Link> before sending or printing.
          </AlertDescription>
        </Alert>
      )}
      <form action={createQuote} className="panel form-stack">
        <label>
          Customer
          <select name="customerId" required>
            {customers.map((customer) => {
              const gaps = customerBillingGaps(customer);
              return <option key={customer.id} value={customer.id}>{customer.name} · {customer.tier}{gaps.length ? " · billing incomplete" : ""}</option>;
            })}
          </select>
        </label>
        <button className="button primary">Create quotation and open builder</button>
      </form>
    </div>
  );
}
