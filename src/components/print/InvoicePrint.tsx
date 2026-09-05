import { formatMoney } from "@/lib/money";
import { invoiceRemainingPaise } from "@/modules/billing/invoice-balance";
import { companyAddressLines, DocumentBank, DocumentLetterhead, DocumentParties } from "./DocumentLetterhead";

type InvoiceData = Awaited<ReturnType<typeof import("@/modules/billing/queries").getInvoice>>;
type Company = Awaited<ReturnType<typeof import("@/modules/company/queries").getCompanyProfile>>;

export function InvoicePrint({ invoice, company }: { invoice: NonNullable<InvoiceData>; company: Company }) {
  const credits = invoice.creditNotes.reduce((sum, note) => sum + note.amountPaise, 0);
  const balance = invoiceRemainingPaise(invoice);
  const customer = invoice.order.quote.customer;
  return (
    <article className="print-document invoice-print">
      <DocumentLetterhead
        company={company}
        title="Invoice"
        code={invoice.code}
        kicker={`Quote ${invoice.order.quote.code} · Order ${invoice.order.code} · ${invoice.kind.replaceAll("_", " ")}`}
        stamp={invoice.status.replaceAll("_", " ")}
        meta={[
          `Issued ${invoice.issuedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
          `Due ${invoice.dueAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
        ]}
      />
      <DocumentParties
        from={{ label: "From", name: company.legalName || company.tradingName, lines: companyAddressLines(company) }}
        to={{
          label: "Bill to",
          name: customer.name,
          lines: [customer.billingAddress, customer.email, customer.phone ? `Phone ${customer.phone}` : "", customer.gstin ? `GSTIN ${customer.gstin}` : ""],
        }}
      />
      <table>
        <thead>
          <tr><th>Description</th><th>Qty</th><th>Unit</th><th>Tax</th><th>Total</th></tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={line.id}>
              <td>{line.description}</td>
              <td>{line.qty}</td>
              <td>{formatMoney(line.unitPaise)}</td>
              <td>{formatMoney(line.taxPaise)}</td>
              <td>{formatMoney(line.totalPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="print-totals">
        <span>Total <b>{formatMoney(invoice.totalPaise)}</b></span>
        <span>Paid <b>{formatMoney(invoice.paidPaise)}</b></span>
        <span>Credits <b>{formatMoney(credits)}</b></span>
        <span className="grand">Balance <b>{formatMoney(balance)}</b></span>
      </div>
      {invoice.payments.length > 0 && (
        <section>
          <h2>Payments</h2>
          {invoice.payments.map((payment) => (
            <p key={payment.id}>{payment.reference} · {payment.method} · {formatMoney(payment.amountPaise)} · {payment.receivedAt.toLocaleDateString("en-IN")}</p>
          ))}
        </section>
      )}
      {balance > 0 && <DocumentBank company={company} />}
    </article>
  );
}
