import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/shared/StatusBadge";

export function UpcomingSchedule({ rows }: { rows: Array<{ periodStart: Date; periodEnd: Date; amountPaise: number; status?: string }> }) {
  if (!rows.length) return <p className="muted">No upcoming billed periods on the schedule.</p>;
  return <div className="schedule-list">{rows.map((row) => <div key={row.periodStart.toISOString()}><span>{row.periodStart.toLocaleDateString("en-IN")} → {row.periodEnd.toLocaleDateString("en-IN")}</span><b>{formatMoney(row.amountPaise)}</b>{row.status ? <StatusBadge status={row.status}/> : null}</div>)}</div>;
}
