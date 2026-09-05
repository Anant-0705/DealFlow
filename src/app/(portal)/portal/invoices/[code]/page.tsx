import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/auth";
import { getInvoice } from "@/modules/billing/queries";
import { cashfreeGatewayStatus } from "@/modules/billing/gateway";
import { getDocumentParties } from "@/modules/company/queries";
import { formatMoney } from "@/lib/money";
import { invoiceRemainingPaise } from "@/modules/billing/invoice-balance";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CashfreePayButton } from "@/components/billing/CashfreePayButton";
import { DocumentReadyAlert } from "@/components/print/DocumentBlocked";
import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function PortalInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const [session, { code }, query] = await Promise.all([requireCustomer(), params, searchParams]);
  const invoice = await getInvoice(code);
  if (!invoice || invoice.order.quote.customer.id !== session.customerId) notFound();
  const [documents, gateway] = await Promise.all([
    getDocumentParties(session.customerId),
    cashfreeGatewayStatus(),
  ]);
  const balance = invoiceRemainingPaise(invoice);
  return (
    <div className="portal-page invoice-page">
      <Link className="back-link" href="/portal/invoices">← Invoices</Link>
      {query.notice && <Alert><AlertDescription>{query.notice}</AlertDescription></Alert>}
      {query.error && <Alert variant="destructive"><AlertDescription>{query.error}</AlertDescription></Alert>}
      <DocumentReadyAlert gaps={documents.gaps} customerName={invoice.order.quote.customer.name} customerHref="/portal/profile" companyHref={null} action="pay this invoice" />
      <div className="page-header">
        <div>
          <div className="eyebrow">{invoice.kind.replaceAll("_", " ")}</div>
          <h1>{invoice.code}</h1>
          <p>Issued {invoice.issuedAt.toLocaleDateString("en-IN")} · Due {invoice.dueAt.toLocaleDateString("en-IN")}</p>
        </div>
        <div className="invoice-balance"><StatusBadge status={invoice.status}/><strong>{formatMoney(balance)}</strong><span>balance due</span></div>
      </div>
      <Card>
        <CardHeader><CardTitle>Invoice lines</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Qty</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {invoice.lines.map((line) => (
                <TableRow key={line.id}><TableCell>{line.description}</TableCell><TableCell>{line.qty}</TableCell><TableCell>{formatMoney(line.totalPaise)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {balance > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pay online</CardTitle>
            <CardDescription>Pay the outstanding balance with Cashfree. Bank transfer details are also on the PDF.</CardDescription>
          </CardHeader>
          <CardContent>
            {gateway.configured && documents.ready
              ? <CashfreePayButton invoiceCode={invoice.code} amountLabel={formatMoney(balance)} />
              : <p className="muted">{gateway.configured ? "Complete your billing profile before paying." : "Online payments are not configured yet."}</p>}
          </CardContent>
        </Card>
      )}
      {documents.ready && (
        <Link className={buttonVariants({ variant: "outline" })} href={`/portal/invoices/${invoice.code}/pdf`}>
          <Download data-icon="inline-start" />
          Download PDF
        </Link>
      )}
    </div>
  );
}
