import Link from "next/link";
import { FileSearch } from "lucide-react";
import { formatMoney, formatPercent } from "@/lib/money";
import type { ReportRow } from "@/modules/reports/queries";
import { EmptyState } from "@/components/shared/EmptyState";

export function ReportTable({ rows, totals }: { rows: ReportRow[]; totals: { count: number; totalPaise: number; marginPaise: number; weightedDiscountBps: number } }) {
  if (!rows.length) return <EmptyState icon={FileSearch} title="No report rows" description="Change the period or filters to include more records."/>;
  return <div className="table-scroll"><table className="report-table"><thead><tr><th>Code</th><th>Date</th><th>Customer</th><th>Tier</th><th>Rep</th><th>Stage</th><th>Lines</th><th>Subtotal</th><th>Discount</th><th>Discount %</th><th>Total</th><th>Margin</th><th>Margin %</th><th>Approval</th><th>Days to approval</th></tr></thead><tbody>{rows.map((row) => <tr key={row.code}><td><Link href={`/app/quotations/${row.code}`}>{row.code}</Link></td><td>{row.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td><td>{row.customer}</td><td>{row.tier}</td><td>{row.rep}</td><td>{row.stage}</td><td>{row.lines}</td><td>{formatMoney(row.subtotalPaise)}</td><td>{formatMoney(row.discountPaise)}</td><td>{formatPercent(row.discountBps, 1)}</td><td>{formatMoney(row.totalPaise)}</td><td>{formatMoney(row.marginPaise)}</td><td>{formatPercent(row.marginBps, 1)}</td><td>{row.approvalLevel}</td><td>{row.daysToApproval ?? "—"}</td></tr>)}</tbody><tfoot><tr><th colSpan={6}>{totals.count} records</th><th>—</th><th>—</th><th>—</th><th>{formatPercent(totals.weightedDiscountBps, 1)}</th><th>{formatMoney(totals.totalPaise)}</th><th>{formatMoney(totals.marginPaise)}</th><th colSpan={3}>—</th></tr></tfoot></table></div>;
}
