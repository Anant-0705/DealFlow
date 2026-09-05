import Link from "next/link";
import { requireCustomer } from "@/lib/auth";
import { listCustomerInvoices } from "@/modules/billing/queries";
import { formatMoney } from "@/lib/money";
import { invoiceRemainingPaise } from "@/modules/billing/invoice-balance";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default async function PortalInvoicesPage() {
  const session = await requireCustomer();
  const invoices = await listCustomerInvoices(session.customerId);
  return (
    <div className="portal-page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Billing</div>
          <h1>Invoices</h1>
          <p>Pay outstanding invoices online. Confirmation created these bills; payment is a separate step.</p>
        </div>
      </div>
      <section className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Invoice</th><th>Kind</th><th>Amount</th><th>Balance</th><th>Status</th><th>Due</th></tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const balance = invoiceRemainingPaise(invoice);
                return (
                  <tr key={invoice.id}>
                    <td><Link href={`/portal/invoices/${invoice.code}`}>{invoice.code}</Link></td>
                    <td>{invoice.kind.replaceAll("_", " ")}</td>
                    <td>{formatMoney(invoice.totalPaise)}</td>
                    <td><strong>{formatMoney(balance)}</strong></td>
                    <td><StatusBadge status={invoice.status}/></td>
                    <td>{invoice.dueAt.toLocaleDateString("en-IN")}</td>
                  </tr>
                );
              })}
              {!invoices.length && <tr><td colSpan={6} className="empty-cell">No invoices yet. Confirm a quotation to generate billing.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
