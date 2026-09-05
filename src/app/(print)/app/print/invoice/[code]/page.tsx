import { notFound } from "next/navigation";
import { InvoicePrint } from "@/components/print/InvoicePrint";
import { PrintTrigger } from "@/components/print/PrintTrigger";
import { getInvoice } from "@/modules/billing/queries";

export default async function PrintInvoicePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invoice = await getInvoice(code);
  if (!invoice) notFound();
  return <><div className="print-toolbar no-print"><p>Use your browser’s print dialog and choose “Save as PDF”.</p><PrintTrigger/></div><InvoicePrint invoice={invoice}/></>;
}
