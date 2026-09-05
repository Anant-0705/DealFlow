import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import type { DocumentGaps } from "@/modules/company/readiness";

export function DocumentBlocked({
  gaps,
  customerName,
  customerHref,
  action,
}: {
  gaps: DocumentGaps;
  customerName?: string;
  customerHref?: string;
  action: string;
}) {
  return (
    <div className="print-blocked no-print">
      <Alert variant="destructive">
        <AlertTitle>Cannot {action} yet</AlertTitle>
        <AlertDescription>
          DealFlow needs complete company letterhead and customer billing details before this document can be generated.
        </AlertDescription>
      </Alert>
      {gaps.company.length > 0 && (
        <section className="panel">
          <span className="eyebrow">Company</span>
          <h2>Settings → Company is incomplete</h2>
          <p className="muted">An administrator or manager must save these fields:</p>
          <ul className="gap-list">{gaps.company.map((item) => <li key={item.field}>{item.label}</li>)}</ul>
          <Link className={buttonVariants()} href="/app/settings/company">Open company settings</Link>
        </section>
      )}
      {gaps.customer.length > 0 && (
        <section className="panel">
          <span className="eyebrow">Customer</span>
          <h2>{customerName ? `${customerName} billing is incomplete` : "Customer billing is incomplete"}</h2>
          <p className="muted">Add these on the customer record, or ask the customer to complete Portal → Profile:</p>
          <ul className="gap-list">{gaps.customer.map((item) => <li key={item.field}>{item.label}</li>)}</ul>
          {customerHref ? <Link className={buttonVariants({ variant: "outline" })} href={customerHref}>Edit customer billing</Link> : null}
        </section>
      )}
    </div>
  );
}

export function DocumentReadyAlert({
  gaps,
  customerName,
  customerHref,
  companyHref = "/app/settings/company",
  action = "send, confirm, or print",
}: {
  gaps: DocumentGaps;
  customerName?: string;
  customerHref?: string;
  companyHref?: string | null;
  action?: string;
}) {
  if (!gaps.company.length && !gaps.customer.length) return null;
  return (
    <Alert variant="destructive" className="no-print">
      <AlertTitle>Details missing for {action}</AlertTitle>
      <AlertDescription>
        {gaps.company.length > 0 && (
          <p>
            Company letterhead is incomplete ({gaps.company.map((item) => item.label).join(", ")}).{" "}
            {companyHref ? <Link href={companyHref}>Open Settings → Company</Link> : "Ask your DealFlow administrator to complete Settings → Company."}
          </p>
        )}
        {gaps.customer.length > 0 && (
          <p>
            Billing details for {customerName ?? "this customer"} are incomplete ({gaps.customer.map((item) => item.label).join(", ")}).{" "}
            {customerHref ? <Link href={customerHref}>Edit customer billing</Link> : "Complete them in Portal → Profile."}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
