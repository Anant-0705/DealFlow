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
import { Download, Building2, Calendar, FileText, CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const isPaid = invoice.status === "PAID" || balance <= 0;
  const company = documents.company;
  const customer = invoice.order.quote.customer;

  const subtotalPaise = invoice.lines.reduce((sum, line) => sum + (line.unitPaise * line.qty), 0);
  const totalTaxPaise = invoice.lines.reduce((sum, line) => sum + line.taxPaise, 0);
  const creditsPaise = invoice.creditNotes.reduce((sum, c) => sum + c.amountPaise, 0);
  const paidPaise = invoice.paidPaise;

  return (
    <div className="portal-page invoice-page" style={{ maxWidth: "980px", margin: "0 auto" }}>
      {/* Top Header Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <Link className="back-link" href="/portal/invoices" style={{ margin: 0 }}>
          ← Back to invoices
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <StatusBadge status={invoice.status} />
          {documents.ready && (
            <Link
              className={buttonVariants({ variant: "outline", size: "sm" })}
              href={`/portal/invoices/${invoice.code}/pdf`}
              target="_blank"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Download size={14} />
              Download PDF
            </Link>
          )}
        </div>
      </div>

      {query.notice && <Alert style={{ marginBottom: "16px" }}><AlertDescription>{query.notice}</AlertDescription></Alert>}
      {query.error && <Alert variant="destructive" style={{ marginBottom: "16px" }}><AlertDescription>{query.error}</AlertDescription></Alert>}
      <DocumentReadyAlert
        gaps={documents.gaps}
        customerName={customer.name}
        customerHref="/portal/profile"
        companyHref={null}
        action="pay this invoice"
      />

      {/* Main Digital Tax Invoice Document */}
      <div
        className="panel"
        style={{
          padding: "32px",
          borderRadius: "12px",
          border: "1px solid var(--line, #e2d4c7)",
          background: "var(--card, #ffffff)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
          marginBottom: "24px",
        }}
      >
        {/* Document Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "1px solid var(--line, #e2d4c7)",
            paddingBottom: "24px",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <span
              style={{
                display: "inline-block",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--muted, #725a4e)",
                marginBottom: "4px",
              }}
            >
              Tax Invoice · {invoice.kind.replaceAll("_", " ")}
            </span>
            <h1 style={{ margin: "2px 0 6px", fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em" }}>
              {invoice.code}
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--muted, #725a4e)" }}>
              Order Reference:{" "}
              <Link
                href={`/portal/quotes/${invoice.order.quote.code}`}
                style={{ fontWeight: 600, color: "var(--ink, #1f1a17)", textDecoration: "underline" }}
              >
                {invoice.order.code}
              </Link>{" "}
              (Quote {invoice.order.quote.code})
            </p>
          </div>

          {/* Amount Due Callout */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "8px",
              background: isPaid ? "rgba(22, 163, 74, 0.08)" : "rgba(0,0,0,0.03)",
              border: `1px solid ${isPaid ? "rgba(22, 163, 74, 0.2)" : "var(--line, #e2d4c7)"}`,
              textAlign: "right",
              minWidth: "220px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: isPaid ? "#15803d" : "var(--muted, #725a4e)",
                marginBottom: "4px",
              }}
            >
              {isPaid ? "Invoice Status" : "Balance Due"}
            </div>
            <div
              style={{
                fontSize: "26px",
                fontWeight: 800,
                color: isPaid ? "#15803d" : "var(--ink, #1f1a17)",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {isPaid ? "Paid in Full" : formatMoney(balance)}
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted, #725a4e)", marginTop: "4px" }}>
              {isPaid ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#15803d" }}>
                  <CheckCircle2 size={12} /> Settled
                </span>
              ) : (
                `Due by ${invoice.dueAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
              )}
            </div>
          </div>
        </div>

        {/* Metadata Details Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "16px",
            padding: "14px 18px",
            borderRadius: "8px",
            background: "rgba(0,0,0,0.02)",
            border: "1px solid var(--line, #e2d4c7)",
            marginBottom: "24px",
          }}
        >
          <div>
            <span style={{ display: "block", fontSize: "11px", color: "var(--muted, #725a4e)" }}>Invoice Date</span>
            <strong style={{ fontSize: "13px" }}>
              {invoice.issuedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </strong>
          </div>
          <div>
            <span style={{ display: "block", fontSize: "11px", color: "var(--muted, #725a4e)" }}>Payment Due</span>
            <strong style={{ fontSize: "13px" }}>
              {invoice.dueAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </strong>
          </div>
          <div>
            <span style={{ display: "block", fontSize: "11px", color: "var(--muted, #725a4e)" }}>Billing Terms</span>
            <strong style={{ fontSize: "13px" }}>Net 15 Days</strong>
          </div>
          <div>
            <span style={{ display: "block", fontSize: "11px", color: "var(--muted, #725a4e)" }}>Sales Order</span>
            <strong style={{ fontSize: "13px" }}>{invoice.order.code}</strong>
          </div>
        </div>

        {/* Parties Grid: Billed By vs Billed To */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "24px",
            marginBottom: "28px",
            paddingBottom: "24px",
            borderBottom: "1px solid var(--line, #e2d4c7)",
          }}
        >
          {/* Seller / Billed By */}
          <div>
            <span
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--muted, #725a4e)",
                marginBottom: "8px",
              }}
            >
              Billed By (Seller)
            </span>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink, #1f1a17)" }}>
              {company.legalName || company.tradingName || "DealFlow Technologies Pvt Ltd"}
            </div>
            {company.addressLine1 && (
              <div style={{ fontSize: "12px", color: "var(--muted, #725a4e)", marginTop: "2px" }}>
                {company.addressLine1}
                {company.city && `, ${company.city}`}
                {company.state && `, ${company.state}`}
                {company.pincode && ` - ${company.pincode}`}
              </div>
            )}
            {company.gstin && (
              <div style={{ fontSize: "12px", color: "var(--muted, #725a4e)", marginTop: "4px" }}>
                <strong>GSTIN:</strong> {company.gstin}
              </div>
            )}
            {company.email && (
              <div style={{ fontSize: "12px", color: "var(--muted, #725a4e)" }}>
                <strong>Email:</strong> {company.email}
              </div>
            )}
          </div>

          {/* Buyer / Billed To */}
          <div>
            <span
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--muted, #725a4e)",
                marginBottom: "8px",
              }}
            >
              Billed To (Customer)
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink, #1f1a17)" }}>
                {customer.name}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: "rgba(0,0,0,0.06)",
                  textTransform: "uppercase",
                }}
              >
                {customer.tier}
              </span>
            </div>
            {customer.billingAddress && (
              <div style={{ fontSize: "12px", color: "var(--muted, #725a4e)", marginTop: "2px", whiteSpace: "pre-line" }}>
                {customer.billingAddress}
              </div>
            )}
            {customer.gstin && (
              <div style={{ fontSize: "12px", color: "var(--muted, #725a4e)", marginTop: "4px" }}>
                <strong>GSTIN:</strong> {customer.gstin}
              </div>
            )}
            {customer.email && (
              <div style={{ fontSize: "12px", color: "var(--muted, #725a4e)" }}>
                <strong>Email:</strong> {customer.email}
              </div>
            )}
          </div>
        </div>

        {/* Invoice Items Table */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ marginBottom: "12px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Invoice line items</h2>
          </div>
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--line, #e2d4c7)", textAlign: "left" }}>
                  <th style={{ padding: "10px 8px", width: "40px", color: "var(--muted, #725a4e)" }}>#</th>
                  <th style={{ padding: "10px 8px", color: "var(--muted, #725a4e)" }}>Description</th>
                  <th style={{ padding: "10px 8px", textAlign: "center", color: "var(--muted, #725a4e)", width: "60px" }}>Qty</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", color: "var(--muted, #725a4e)", width: "120px" }}>Unit Price</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", color: "var(--muted, #725a4e)", width: "110px" }}>GST (18%)</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", color: "var(--muted, #725a4e)", width: "130px" }}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line, index) => (
                  <tr
                    key={line.id}
                    style={{
                      borderBottom: "1px solid var(--line, #e2d4c7)",
                      background: index % 2 === 1 ? "rgba(0,0,0,0.015)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "12px 8px", color: "var(--muted, #725a4e)" }}>{index + 1}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <strong style={{ display: "block", color: "var(--ink, #1f1a17)" }}>{line.description}</strong>
                    </td>
                    <td style={{ padding: "12px 8px", textAlign: "center" }}>{line.qty}</td>
                    <td style={{ padding: "12px 8px", textAlign: "right" }}>{formatMoney(line.unitPaise)}</td>
                    <td style={{ padding: "12px 8px", textAlign: "right", color: "var(--muted, #725a4e)" }}>
                      {formatMoney(line.taxPaise)}
                    </td>
                    <td style={{ padding: "12px 8px", textAlign: "right" }}>
                      <strong>{formatMoney(line.totalPaise)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Commercial Summary Totals Block */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
          <div style={{ width: "100%", maxWidth: "340px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "var(--muted, #725a4e)" }}>
              <span>Subtotal (Excl. Tax):</span>
              <span style={{ fontWeight: 600, color: "var(--ink, #1f1a17)" }}>{formatMoney(subtotalPaise)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "var(--muted, #725a4e)" }}>
              <span>Total GST (18%):</span>
              <span style={{ fontWeight: 600, color: "var(--ink, #1f1a17)" }}>{formatMoney(totalTaxPaise)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                fontSize: "15px",
                fontWeight: 700,
                borderTop: "1px solid var(--line, #e2d4c7)",
                marginTop: "4px",
                color: "var(--ink, #1f1a17)",
              }}
            >
              <span>Total Invoice Amount:</span>
              <span>{formatMoney(invoice.totalPaise)}</span>
            </div>
            {paidPaise > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#15803d" }}>
                <span>Paid Amount:</span>
                <span style={{ fontWeight: 600 }}>−{formatMoney(paidPaise)}</span>
              </div>
            )}
            {creditsPaise > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#b91c1c" }}>
                <span>Credits Applied:</span>
                <span style={{ fontWeight: 600 }}>−{formatMoney(creditsPaise)}</span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                fontSize: "17px",
                fontWeight: 800,
                borderTop: "2px solid var(--line, #e2d4c7)",
                marginTop: "6px",
                color: isPaid ? "#15803d" : "var(--ink, #1f1a17)",
              }}
            >
              <span>Balance Due:</span>
              <span>{formatMoney(balance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment & Settlement Section */}
      {balance > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          {/* Online Gateway Card */}
          <div
            className="panel"
            style={{
              padding: "24px",
              borderRadius: "10px",
              border: "1px solid var(--line, #e2d4c7)",
              background: "var(--card, #ffffff)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <CreditCard size={18} style={{ color: "var(--primary)" }} />
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Pay online with Cashfree</h3>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--muted, #725a4e)", lineHeight: 1.4 }}>
              Instant payment settlement supporting UPI, Net Banking, and Credit / Debit Cards.
            </p>
            {gateway.configured && documents.ready ? (
              <div>
                <CashfreePayButton invoiceCode={invoice.code} amountLabel={formatMoney(balance)} />
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--muted, #725a4e)", marginTop: "10px" }}>
                  <ShieldCheck size={13} style={{ color: "#15803d" }} />
                  256-bit encrypted secure checkout via Cashfree Payments
                </div>
              </div>
            ) : (
              <p className="muted" style={{ fontSize: "13px" }}>
                {gateway.configured
                  ? "Complete your billing profile before paying."
                  : "Online payments gateway is currently in sandbox or not configured."}
              </p>
            )}
          </div>

          {/* Corporate Bank Transfer / NEFT Card */}
          <div
            className="panel"
            style={{
              padding: "24px",
              borderRadius: "10px",
              border: "1px solid var(--line, #e2d4c7)",
              background: "var(--card, #ffffff)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <Building2 size={18} style={{ color: "var(--primary)" }} />
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Direct Bank Transfer (NEFT / RTGS)</h3>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: "13px", color: "var(--muted, #725a4e)", lineHeight: 1.4 }}>
              For corporate bank payments, transfer directly to our current account:
            </p>
            <div
              style={{
                display: "grid",
                gap: "6px",
                fontSize: "12px",
                background: "rgba(0,0,0,0.02)",
                padding: "12px 14px",
                borderRadius: "6px",
                border: "1px solid var(--line, #e2d4c7)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted, #725a4e)" }}>Bank Name:</span>
                <strong>{company.bankName || "HDFC Bank"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted, #725a4e)" }}>Account Name:</span>
                <strong>{company.bankAccountName || company.legalName || "DealFlow Technologies Pvt Ltd"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted, #725a4e)" }}>Account Number:</span>
                <strong style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}>
                  {company.bankAccountNo || "50200084729103"}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted, #725a4e)" }}>IFSC Code:</span>
                <strong style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}>
                  {company.bankIfsc || "HDFC0000042"}
                </strong>
              </div>
            </div>
            <small style={{ display: "block", marginTop: "8px", color: "var(--muted, #725a4e)", fontSize: "11px" }}>
              * Please include <strong>{invoice.code}</strong> in your transfer remarks for immediate reconciliation.
            </small>
          </div>
        </div>
      ) : (
        /* Paid in full confirmation */
        <div
          className="panel"
          style={{
            padding: "24px",
            borderRadius: "10px",
            border: "1px solid rgba(22, 163, 74, 0.2)",
            background: "rgba(22, 163, 74, 0.05)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          <CheckCircle2 size={28} style={{ color: "#15803d", flexShrink: 0 }} />
          <div>
            <h3 style={{ margin: "0 0 2px", fontSize: "16px", fontWeight: 700, color: "#15803d" }}>
              Invoice Settled
            </h3>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--muted, #725a4e)" }}>
              Thank you! This invoice has been fully paid. You can download the official receipt PDF above.
            </p>
          </div>
        </div>
      )}

      {/* Payments History Ledger if payments exist */}
      {invoice.payments.length > 0 && (
        <div
          className="panel"
          style={{
            padding: "20px 24px",
            borderRadius: "10px",
            border: "1px solid var(--line, #e2d4c7)",
            background: "var(--card, #ffffff)",
            marginBottom: "24px",
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700 }}>Payment history</h3>
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line, #e2d4c7)", textAlign: "left" }}>
                  <th style={{ padding: "8px", color: "var(--muted, #725a4e)" }}>Reference</th>
                  <th style={{ padding: "8px", color: "var(--muted, #725a4e)" }}>Method</th>
                  <th style={{ padding: "8px", color: "var(--muted, #725a4e)" }}>Date</th>
                  <th style={{ padding: "8px", textAlign: "right", color: "var(--muted, #725a4e)" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--line, #e2d4c7)" }}>
                    <td style={{ padding: "10px 8px", fontWeight: 600 }}>{p.reference}</td>
                    <td style={{ padding: "10px 8px" }}>{p.method}</td>
                    <td style={{ padding: "10px 8px", color: "var(--muted, #725a4e)" }}>
                      {new Date(p.receivedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, color: "#15803d" }}>
                      {formatMoney(p.amountPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
