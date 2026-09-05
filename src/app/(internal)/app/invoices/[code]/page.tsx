import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoice } from "@/modules/billing/queries";
import { issueCreditNote, recordPayment } from "@/modules/billing/actions";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { InvoiceStepper } from "@/components/billing/InvoiceStepper";
import { PrintButton } from "@/components/billing/PrintButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  const invoice = await getInvoice(code);
  if (!invoice) notFound();
  const balance = invoice.totalPaise - invoice.paidPaise;
  const shipped = invoice.order.lines.some((line) => line.allocations.some((allocation) => Boolean(allocation.shippedAt)));
  const today = new Date().toISOString().slice(0, 10);

  return <div className="invoice-page">
    <Link className="back-link no-print" href="/app/invoices">← Invoices</Link>
    {query.notice && <Alert className="no-print"><AlertDescription>{query.notice}</AlertDescription></Alert>}
    <div className="page-header"><div><div className="eyebrow">{invoice.order.quote.customer.name} · {invoice.kind.replaceAll("_", " ")}</div><h1>{invoice.code}</h1><p>Issued {invoice.issuedAt.toLocaleDateString("en-IN")} · Due {invoice.dueAt.toLocaleDateString("en-IN")}</p></div><div className="invoice-balance"><StatusBadge status={invoice.status}/><strong>{formatMoney(balance)}</strong><span>balance due</span></div></div>
    <InvoiceStepper confirmed shipped={shipped} invoiced paid={invoice.status === "PAID"}/>

    <Card>
      <CardHeader><CardTitle>Invoice lines</CardTitle><CardDescription>Amounts and taxes captured from the confirmed quotation.</CardDescription></CardHeader>
      <CardContent><Table><TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead><TableHead>Tax</TableHead><TableHead>Total</TableHead></TableRow></TableHeader><TableBody>{invoice.lines.map((line) => <TableRow key={line.id}><TableCell>{line.description}</TableCell><TableCell>{line.qty}</TableCell><TableCell>{formatMoney(line.unitPaise)}</TableCell><TableCell>{formatMoney(line.taxPaise)}</TableCell><TableCell><strong>{formatMoney(line.totalPaise)}</strong></TableCell></TableRow>)}</TableBody></Table></CardContent>
    </Card>

    <div className="invoice-detail-grid">
      <Card><CardHeader><CardTitle>Payments received</CardTitle></CardHeader><CardContent>{invoice.payments.map((payment) => <div className="ledger-row" key={payment.id}><span>{payment.reference}<small>{payment.method} · {payment.receivedAt.toLocaleDateString("en-IN")} · {payment.recordedBy.name}</small></span><b>{formatMoney(payment.amountPaise)}</b></div>)}{!invoice.payments.length && <p className="muted">No payments recorded.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Credit notes</CardTitle></CardHeader><CardContent>{invoice.creditNotes.map((credit) => <div className="ledger-row" key={credit.id}><span>{credit.code}<small>{credit.reason}</small></span><b>−{formatMoney(credit.amountPaise)}</b></div>)}{!invoice.creditNotes.length && <p className="muted">No credits applied.</p>}</CardContent></Card>
    </div>

    <div className="invoice-actions no-print">
      <Card><CardHeader><CardTitle>Record payment</CardTitle><CardDescription>References are idempotent and cannot be recorded twice.</CardDescription></CardHeader><CardContent><form action={recordPayment} className="form-stack"><input type="hidden" name="invoiceCode" value={invoice.code}/><FieldGroup><Field><FieldLabel htmlFor="payment-amount">Amount ₹</FieldLabel><Input id="payment-amount" name="amountRupees" type="number" min="0.01" max={balance / 100} step="0.01" defaultValue={balance / 100}/></Field><Field><FieldLabel htmlFor="payment-reference">Reference</FieldLabel><Input id="payment-reference" name="reference" defaultValue={`PAY-${invoice.code}-${today.replaceAll("-", "")}-${invoice.payments.length + 1}`} required/></Field><div className="form-row"><Field><FieldLabel htmlFor="payment-method">Method</FieldLabel><NativeSelect id="payment-method" name="method"><NativeSelectOption>Bank transfer</NativeSelectOption><NativeSelectOption>Card</NativeSelectOption><NativeSelectOption>Cheque</NativeSelectOption><NativeSelectOption>Cash</NativeSelectOption></NativeSelect></Field><Field><FieldLabel htmlFor="payment-date">Received</FieldLabel><Input id="payment-date" name="receivedAt" type="date" defaultValue={today}/></Field></div></FieldGroup><Button type="submit" disabled={balance <= 0}>Record payment</Button></form></CardContent></Card>
      <Card><CardHeader><CardTitle>Manual credit note</CardTitle><CardDescription>Reduce the outstanding invoice balance with an auditable reason.</CardDescription></CardHeader><CardContent><form action={issueCreditNote} className="form-stack"><input type="hidden" name="invoiceId" value={invoice.id}/><input type="hidden" name="invoiceCode" value={invoice.code}/><FieldGroup><Field><FieldLabel htmlFor="credit-amount">Amount ₹</FieldLabel><Input id="credit-amount" name="amountRupees" type="number" min="0.01" max={Math.max(0, balance / 100)} step="0.01"/></Field><Field><FieldLabel htmlFor="credit-reason">Reason</FieldLabel><Textarea id="credit-reason" name="reason" required minLength={3}/></Field></FieldGroup><Button type="submit" variant="outline" disabled={balance <= 0}>Issue credit</Button></form></CardContent></Card>
    </div>
    <PrintButton invoiceCode={invoice.code}/>
  </div>;
}
