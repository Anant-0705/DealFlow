import { PrintTrigger } from "@/components/print/PrintTrigger";
import { ReportPrint } from "@/components/print/ReportPrint";
import { requireInternal } from "@/lib/auth";
import { parseReportFilters } from "@/modules/reports/filters";
import { getReportData } from "@/modules/reports/queries";

export default async function PrintReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [session, params] = await Promise.all([requireInternal(), searchParams]);
  const filters = parseReportFilters(params);
  const data = await getReportData(session, filters);
  return <><div className="print-toolbar no-print"><p>Use your browser’s print dialog and choose “Save as PDF”.</p><PrintTrigger/></div><ReportPrint rows={data.rows} totals={data.totals} filters={filters}/></>;
}
