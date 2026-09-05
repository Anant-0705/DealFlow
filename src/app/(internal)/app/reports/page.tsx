import { ExportButtons } from "@/components/reports/ExportButtons";
import { ReportAggregates } from "@/components/reports/ReportAggregates";
import { ReportFiltersForm } from "@/components/reports/ReportFilters";
import { ReportTable } from "@/components/reports/ReportTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireInternal } from "@/lib/auth";
import { parseReportFilters } from "@/modules/reports/filters";
import { getReportData, getReportOptions } from "@/modules/reports/queries";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [session, params, options] = await Promise.all([requireInternal(), searchParams, getReportOptions()]);
  const filters = parseReportFilters(params);
  const data = await getReportData(session, filters);
  return <div><PageHeader eyebrow="Commercial reporting" title="Reports" description="Filter live deal performance, inspect totals, and export the same view." actions={<ExportButtons filters={filters}/>}/><section className="panel"><ReportFiltersForm filters={filters} options={options} lockRep={session.role === "REP"}/></section><ReportAggregates values={data.aggregates}/><section className="panel section-gap"><ReportTable rows={data.rows} totals={data.totals}/></section></div>;
}
