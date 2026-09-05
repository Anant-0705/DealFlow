import "server-only";

import ExcelJS from "exceljs";
import type { ReportFilters } from "./filters";
import type { ReportRow } from "./queries";

export async function buildReportWorkbook(rows: ReportRow[], totals: { count: number; totalPaise: number; marginPaise: number; weightedDiscountBps: number }, filters: ReportFilters) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AccordFlow";
  workbook.created = new Date();
  const report = workbook.addWorksheet("Report", { views: [{ state: "frozen", ySplit: 1 }] });
  report.columns = [
    { header: "Code", key: "code", width: 13 }, { header: "Date", key: "date", width: 13 }, { header: "Customer", key: "customer", width: 24 },
    { header: "Tier", key: "tier", width: 12 }, { header: "Rep", key: "rep", width: 20 }, { header: "Stage", key: "stage", width: 22 },
    { header: "Lines", key: "lines", width: 9 }, { header: "Subtotal", key: "subtotal", width: 16 }, { header: "Discount", key: "discount", width: 16 },
    { header: "Discount %", key: "discountPercent", width: 13 }, { header: "Total", key: "total", width: 16 }, { header: "Margin", key: "margin", width: 16 },
    { header: "Margin %", key: "marginPercent", width: 12 }, { header: "Approval", key: "approval", width: 14 }, { header: "Days to approval", key: "days", width: 16 },
  ];
  for (const row of rows) report.addRow({ code: row.code, date: row.date, customer: row.customer, tier: row.tier, rep: row.rep, stage: row.stage, lines: row.lines, subtotal: row.subtotalPaise / 100, discount: row.discountPaise / 100, discountPercent: row.discountBps / 10_000, total: row.totalPaise / 100, margin: row.marginPaise / 100, marginPercent: row.marginBps / 10_000, approval: row.approvalLevel, days: row.daysToApproval });
  report.addRow({ code: "TOTAL", customer: `${totals.count} records`, discountPercent: totals.weightedDiscountBps / 10_000, total: totals.totalPaise / 100, margin: totals.marginPaise / 100 });
  report.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  report.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF725A4E" } };
  report.getRow(report.rowCount).font = { bold: true };
  [8, 9, 11, 12].forEach((column) => { report.getColumn(column).numFmt = '₹#,##0.00'; });
  [10, 13].forEach((column) => { report.getColumn(column).numFmt = "0.0%"; });
  report.getColumn(2).numFmt = "dd mmm yyyy";

  const filtersSheet = workbook.addWorksheet("Filters");
  filtersSheet.columns = [{ header: "Filter", key: "filter", width: 24 }, { header: "Value", key: "value", width: 36 }];
  filtersSheet.addRows([
    { filter: "Period", value: filters.period }, { filter: "Record type", value: filters.mode }, { filter: "From", value: filters.from ?? "Calculated from period" },
    { filter: "To", value: filters.to ?? "Today" }, { filter: "Rep ID", value: filters.repId ?? "All" }, { filter: "Approval status", value: filters.approvalStatus },
    { filter: "Category ID", value: filters.categoryId ?? "All" }, { filter: "Product ID", value: filters.productId ?? "All" }, { filter: "Generated at", value: new Date().toISOString() },
  ]);
  filtersSheet.getRow(1).font = { bold: true };
  return workbook.xlsx.writeBuffer();
}
