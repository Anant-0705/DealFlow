import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getInvoice } from "@/modules/billing/queries";
import { getDocumentParties } from "@/modules/company/queries";
import { buildInvoicePdf, pdfResponse } from "@/modules/documents/pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const session = await getSession();
  if (!session || session.role === "CUSTOMER") return new Response("Unauthorized", { status: 401 });
  const { code } = await params;
  const invoice = await getInvoice(code);
  if (!invoice) return new Response("Invoice not found", { status: 404 });
  const documents = await getDocumentParties(invoice.order.quote.customer.id);
  if (!documents.ready) redirect(`/app/print/invoice/${code}`);
  const bytes = await buildInvoicePdf(invoice, documents.company);
  return pdfResponse(bytes, `DealFlow-invoice-${invoice.code}.pdf`);
}
