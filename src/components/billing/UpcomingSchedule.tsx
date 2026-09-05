import { formatMoney } from "@/lib/money";

export function UpcomingSchedule({ rows }: { rows: Array<{ periodStart: Date; periodEnd: Date; amountPaise: number }> }) {
  return <div className="schedule-list">{rows.map((row) => <div key={row.periodStart.toISOString()}><span>{row.periodStart.toLocaleDateString("en-IN")} → {row.periodEnd.toLocaleDateString("en-IN")}</span><b>{formatMoney(row.amountPaise)}</b></div>)}</div>;
}
