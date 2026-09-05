import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function DocumentActions({ printHref, pdfHref, className = "" }: { printHref: string; pdfHref: string; className?: string }) {
  return (
    <div className={`header-actions no-print ${className}`.trim()}>
      <Link className={buttonVariants({ variant: "outline" })} href={printHref} target="_blank">
        <Printer data-icon="inline-start" />
        Print preview
      </Link>
      <Link className={buttonVariants()} href={pdfHref}>
        <Download data-icon="inline-start" />
        Download PDF
      </Link>
    </div>
  );
}
