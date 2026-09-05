import { DocumentActions } from "@/components/print/DocumentActions";

export function PrintButton({ invoiceCode }: { invoiceCode: string }) {
  return <DocumentActions printHref={`/app/print/invoice/${invoiceCode}`} pdfHref={`/app/print/invoice/${invoiceCode}/pdf`} />;
}
