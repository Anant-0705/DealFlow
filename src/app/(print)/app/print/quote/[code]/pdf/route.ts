import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDocumentParties } from "@/modules/company/queries";
import { buildQuotePdf, pdfResponse } from "@/modules/documents/pdf";
import { getQuoteForPrint } from "@/modules/quotes/queries";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const session = await getSession();
  if (!session || session.role === "CUSTOMER") return new Response("Unauthorized", { status: 401 });
  const { code } = await params;
  const quote = await getQuoteForPrint(code);
  if (!quote?.currentRevision) return new Response("Quotation not found", { status: 404 });
  const documents = await getDocumentParties(quote.customerId);
  if (!documents.ready) redirect(`/app/print/quote/${code}`);
  const bytes = await buildQuotePdf(quote, documents.company);
  return pdfResponse(bytes, `DealFlow-quotation-${quote.code}.pdf`);
}
