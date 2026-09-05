import { formatMoney, formatPercent } from "@/lib/money";
import { companyAddressLines, DocumentBank, DocumentLetterhead, DocumentParties } from "./DocumentLetterhead";

type QuotePrintData = NonNullable<Awaited<ReturnType<typeof import("@/modules/quotes/queries").getQuoteForPrint>>>;
type Company = Awaited<ReturnType<typeof import("@/modules/company/queries").getCompanyProfile>>;

export function QuotePrint({ quote, company }: { quote: QuotePrintData; company: Company }) {
  const revision = quote.currentRevision;
  if (!revision) return null;
  const confirmed = quote.customerStatus === "CONFIRMED";
  const confirmedAt = quote.orders[0]?.confirmedAt;
  const stamp = confirmed ? "Confirmed" : quote.customerStatus === "SENT" || quote.customerStatus === "NEGOTIATING" ? "Sent" : "Draft";
  return (
    <article className="print-document quote-print">
      <DocumentLetterhead
        company={company}
        title="Quotation"
        code={quote.code}
        kicker={`Revision v${revision.version} · Prepared by ${quote.owner.name}`}
        stamp={stamp}
        meta={[
          confirmed && confirmedAt ? `Confirmed ${confirmedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : `Updated ${quote.lastActivityAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
          quote.promisedDeliveryDate ? `Promised delivery ${quote.promisedDeliveryDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : null,
        ]}
      />
      <DocumentParties
        from={{ label: "From", name: company.legalName || company.tradingName, lines: companyAddressLines(company) }}
        to={{
          label: "Quoted to",
          name: quote.customer.name,
          lines: [quote.customer.billingAddress, quote.customer.email, quote.customer.phone ? `Phone ${quote.customer.phone}` : "", quote.customer.gstin ? `GSTIN ${quote.customer.gstin}` : ""],
        }}
      />
      <table>
        <thead>
          <tr><th>Description</th><th>Qty</th><th>Unit</th><th>Discount</th><th>Tax</th><th>Net</th></tr>
        </thead>
        <tbody>
          {revision.lines.map((line) => (
            <tr key={line.id}>
              <td>{line.description}{line.variant ? <small>{line.variant.attributeValue}</small> : null}</td>
              <td>{line.qty}</td>
              <td>{formatMoney(line.unitPricePaise)}</td>
              <td>{formatPercent(line.lineDiscountBps, 1)}</td>
              <td>{formatMoney(line.taxPaise)}</td>
              <td>{formatMoney(line.netPaise + line.taxPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="print-totals">
        <span>Subtotal <b>{formatMoney(revision.subtotalPaise)}</b></span>
        <span>Discount <b>−{formatMoney(revision.discountPaise)}</b></span>
        <span>Tax <b>{formatMoney(revision.taxPaise)}</b></span>
        <span className="grand">Total <b>{formatMoney(revision.totalPaise)}</b></span>
      </div>
      <section className="print-terms">
        <h2>Terms</h2>
        <p>Prices are in INR. Confirmation creates an order and invoice(s); this quotation is not a tax invoice.</p>
        {confirmed ? <p>This document is the confirmed commercial agreement for {quote.code}.</p> : <p>This quotation is an offer. It becomes binding when the customer confirms it in the DealFlow portal.</p>}
      </section>
      {!confirmed && <DocumentBank company={company} />}
    </article>
  );
}
