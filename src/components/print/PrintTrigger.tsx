"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

export function PrintTrigger({ pdfHref }: { pdfHref?: string }) {
  return (
    <div className="header-actions no-print">
      <Button type="button" variant="outline" onClick={() => window.print()}>Print</Button>
      {pdfHref ? <Link className={buttonVariants()} href={pdfHref}><Download data-icon="inline-start" />Download PDF</Link> : null}
    </div>
  );
}
