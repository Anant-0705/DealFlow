import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { HealthAlertRow } from "@/modules/health/queries";
import { AlertActions } from "./AlertActions";
import { EmptyState } from "@/components/shared/EmptyState";

const labels = { STALLED: "Stalled", DISCOUNT_ANOMALY: "Discount anomaly", DELIVERY_SLIPPAGE: "Delivery slippage" } as const;

export function AlertTable({ alerts, canAct, canSchedule, emptyDescription }: { alerts: HealthAlertRow[]; canAct: boolean; canSchedule: boolean; emptyDescription: string }) {
  if (!alerts.length) return <EmptyState icon={ShieldCheck} title="No deals at risk" description={emptyDescription}/>;
  return (
    <div className="table-scroll">
      <table className="health-table">
        <thead>
          <tr>
            <th>Deal</th>
            <th>Issue</th>
            <th>Reason</th>
            <th>Flagged since</th>
            <th>Action taken</th>
            {canAct && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => (
            <tr key={`${alert.quoteId}-${alert.kind}-${alert.orderCode ?? ""}-${alert.productId ?? ""}-${alert.variantId ?? "base"}`}>
              <td>
                <Link href={`/app/quotations/${alert.code}`}>
                  <strong>{alert.code}</strong>
                  <small>{alert.customer} · {alert.rep}</small>
                </Link>
              </td>
              <td>
                <span className={`health-badge ${alert.severity}`}>{labels[alert.kind]}</span>
                {alert.insufficientHistory && <small>Limited history</small>}
              </td>
              <td className="health-reason">
                <Link href={`/app/quotations/${alert.code}`}>{alert.reason}</Link>
              </td>
              <td>{alert.flaggedSince.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</td>
              <td>{alert.actionTaken ?? "—"}</td>
              {canAct && <td><AlertActions quoteId={alert.quoteId} kind={alert.kind} scheduleReceipt={alert.scheduleReceipt} canSchedule={canSchedule}/></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
