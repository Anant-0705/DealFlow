import { getSession } from "@/lib/auth";
import { buildReportWorkbook } from "@/modules/reports/exportXlsx";
import { parseReportFilters } from "@/modules/reports/filters";
import { getReportData } from "@/modules/reports/queries";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role === "CUSTOMER") return new Response("Unauthorized", { status: 401 });
  const url = new URL(request.url);
  const filters = parseReportFilters(Object.fromEntries(url.searchParams));
  const data = await getReportData(session, filters);
  const workbook = await buildReportWorkbook(data.rows, data.totals, filters);
  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="accordflow-report-${filters.period}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
