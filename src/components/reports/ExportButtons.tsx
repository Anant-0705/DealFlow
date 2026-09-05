import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { filtersToSearchParams, type ReportFilters } from "@/modules/reports/filters";

export function ExportButtons({ filters }: { filters: ReportFilters }) {
  const query = filtersToSearchParams(filters).toString();
  return <div className="header-actions"><Link className={buttonVariants({ variant: "outline" })} href={`/app/reports/export?${query}`}><Download data-icon="inline-start"/>Export XLSX</Link><Link className={buttonVariants()} href={`/app/print/report?${query}`} target="_blank"><Printer data-icon="inline-start"/>Print / Save PDF</Link></div>;
}
