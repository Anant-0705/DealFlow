import { notFound } from "next/navigation";
import { DocumentBlocked } from "@/components/print/DocumentBlocked";
import { PrintPageStyle } from "@/components/print/DocumentLetterhead";
import { PrintTrigger } from "@/components/print/PrintTrigger";
import { QuotePrint } from "@/components/print/QuotePrint";
import { getDocumentParties } from "@/modules/company/queries";
import { getQuoteForPrint } from "@/modules/quotes/queries";

export default async function PrintQuotePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const quote = await getQuoteForPrint(code);
  if (!quote?.currentRevision) notFound();
  const documents = await getDocumentParties(quote.customerId);
  if (!documents.ready || !documents.customer) {
    return <DocumentBlocked gaps={documents.gaps} customerName={quote.customer.name} customerHref={`/app/settings/customers/${quote.customer.code}`} action="print this quotation" />;
  }
  return (
    <>
      <PrintPageStyle />
      <div className="print-toolbar no-print">
        <p>Download a PDF, or print this page and choose “Save as PDF”.</p>
        <PrintTrigger pdfHref={`/app/print/quote/${code}/pdf`} />
      </div>
      <QuotePrint quote={quote} company={documents.company} />
    </>
  );
}
