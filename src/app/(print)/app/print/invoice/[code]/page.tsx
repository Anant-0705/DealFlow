import { notFound } from "next/navigation";
import { DocumentBlocked } from "@/components/print/DocumentBlocked";
import { PrintPageStyle } from "@/components/print/DocumentLetterhead";
import { InvoicePrint } from "@/components/print/InvoicePrint";
import { PrintTrigger } from "@/components/print/PrintTrigger";
import { getInvoice } from "@/modules/billing/queries";
import { getDocumentParties } from "@/modules/company/queries";

export default async function PrintInvoicePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invoice = await getInvoice(code);
  if (!invoice) notFound();
  const customer = invoice.order.quote.customer;
  const documents = await getDocumentParties(customer.id);
  if (!documents.ready) {
    return <DocumentBlocked gaps={documents.gaps} customerName={customer.name} customerHref={`/app/settings/customers/${customer.code}`} action="print this invoice" />;
  }
  return (
    <>
      <PrintPageStyle />
      <div className="print-toolbar no-print">
        <p>Download a PDF, or print this page and choose “Save as PDF”.</p>
        <PrintTrigger pdfHref={`/app/print/invoice/${code}/pdf`} />
      </div>
      <InvoicePrint invoice={invoice} company={documents.company} />
    </>
  );
}
